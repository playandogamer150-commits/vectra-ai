import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { BlueprintBuilder } from "@/components/blueprint-builder";
import type { PromptBlueprint } from "@shared/schema";
import { 
  Search, ArrowRight, Layers, Grid3X3, Camera, Tv, Palette, Gamepad2, 
  Frame, Monitor, Plus, MoreHorizontal, Pencil, Copy, Trash2, User,
  Sparkles, Box, Image, Cpu
} from "lucide-react";

interface UserBlueprint {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  category: string;
  tags: string[];
  blocks: string[];
  constraints: Record<string, unknown>;
  compatibleProfiles: string[];
  version: number;
  isActive: number;
  createdAt: string;
  updatedAt: string;
}

const categoryIcons: Record<string, React.ElementType> = {
  aesthetic: Palette,
  layout: Grid3X3,
  surveillance: Camera,
  retro: Tv,
  gaming: Gamepad2,
  fashion: Frame,
  ui: Monitor,
  custom: User,
  product: Box,
  portrait: User,
  scene: Image,
  technical: Cpu,
};

const categories = ["all", "aesthetic", "layout", "product", "portrait", "scene", "technical", "custom"];

export default function LibraryPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeTab, setActiveTab] = useState("system");
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingBlueprint, setEditingBlueprint] = useState<UserBlueprint | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [blueprintToDelete, setBlueprintToDelete] = useState<UserBlueprint | null>(null);

  const { data: blueprints, isLoading } = useQuery<PromptBlueprint[]>({
    queryKey: ["/api/blueprints"],
  });

  const { data: userBlueprints, isLoading: loadingUserBlueprints } = useQuery<UserBlueprint[]>({
    queryKey: ["/api/user-blueprints"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/user-blueprints/${id}`);
    },
    onSuccess: () => {
      toast({ title: t.blueprintBuilder?.deleted || "Blueprint deleted" });
      queryClient.invalidateQueries({ queryKey: ["/api/user-blueprints"] });
      setDeleteDialogOpen(false);
      setBlueprintToDelete(null);
    },
    onError: (error: Error) => {
      toast({ title: t.blueprintBuilder?.error || "Error", description: error.message, variant: "destructive" });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/user-blueprints/${id}/duplicate`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: t.blueprintBuilder?.duplicated || "Blueprint duplicated" });
      queryClient.invalidateQueries({ queryKey: ["/api/user-blueprints"] });
    },
    onError: (error: Error) => {
      toast({ title: t.blueprintBuilder?.error || "Error", description: error.message, variant: "destructive" });
    },
  });

  const filteredBlueprints = blueprints?.filter((bp) => {
    const matchesSearch = bp.name.toLowerCase().includes(search.toLowerCase()) ||
      bp.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === "all" || bp.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const filteredUserBlueprints = userBlueprints?.filter((bp) => {
    const matchesSearch = bp.name.toLowerCase().includes(search.toLowerCase()) ||
      (bp.description?.toLowerCase().includes(search.toLowerCase()) || false);
    const matchesCategory = activeCategory === "all" || bp.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const handleEdit = (bp: UserBlueprint) => {
    setEditingBlueprint(bp);
    setBuilderOpen(true);
  };

  const handleCreate = () => {
    setEditingBlueprint(null);
    setBuilderOpen(true);
  };

  const handleDelete = (bp: UserBlueprint) => {
    setBlueprintToDelete(bp);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (blueprintToDelete) {
      deleteMutation.mutate(blueprintToDelete.id);
    }
  };

  return (
    <div className="min-h-screen pt-14 bg-[#FAFAFA] dark:bg-background">
      <div className="max-w-6xl mx-auto px-6 lg:px-8 py-12">
        <div className="mb-10">
          <h1 className="text-3xl font-semibold tracking-tight text-[#0F172A] dark:text-foreground mb-2" data-testid="text-library-title">
            {t.library.title}
          </h1>
          <p className="text-[#64748B] dark:text-muted-foreground text-base">{t.library.subtitle}</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <TabsList className="bg-white dark:bg-card border border-black/[0.04] dark:border-border p-1 rounded-xl">
              <TabsTrigger 
                value="system" 
                className="rounded-lg px-4 py-2 text-sm font-medium data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#A855F7]/10 data-[state=active]:to-[#EC4899]/10 data-[state=active]:text-[#A855F7]" 
                data-testid="tab-system-blueprints"
              >
                {t.blueprintBuilder?.systemBlueprints || "System Blueprints"}
              </TabsTrigger>
              <TabsTrigger 
                value="my" 
                className="rounded-lg px-4 py-2 text-sm font-medium data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#A855F7]/10 data-[state=active]:to-[#EC4899]/10 data-[state=active]:text-[#A855F7]" 
                data-testid="tab-my-blueprints"
              >
                {t.blueprintBuilder?.myBlueprints || "My Blueprints"}
                {userBlueprints && userBlueprints.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-[#A855F7]/10 text-[#A855F7]">
                    {userBlueprints.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
            
            {activeTab === "my" && (
              <Button 
                onClick={handleCreate} 
                className="gap-2 bg-gradient-to-r from-[#A855F7] to-[#EC4899] hover:opacity-90 text-white border-0 rounded-xl shadow-sm"
                data-testid="button-create-blueprint"
              >
                <Plus className="w-4 h-4" />
                {t.blueprintBuilder?.createNew || "Create New"}
              </Button>
            )}
          </div>

          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
              <Input
                placeholder={t.library.searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-11 h-11 rounded-xl bg-white dark:bg-card border-black/[0.04] dark:border-border focus:border-[#A855F7]/30 focus:ring-[#A855F7]/20"
                data-testid="input-search"
              />
            </div>
            <div className="flex gap-2 flex-wrap overflow-x-auto pb-1">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`
                    px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-150
                    ${activeCategory === cat 
                      ? "bg-gradient-to-r from-[#A855F7]/10 to-[#EC4899]/10 text-[#A855F7] border border-[#A855F7]/20" 
                      : "bg-white dark:bg-card text-[#64748B] hover:text-[#0F172A] dark:hover:text-foreground border border-black/[0.04] dark:border-border hover:border-black/[0.08]"
                    }
                  `}
                  data-testid={`button-category-${cat}`}
                >
                  {cat === "all" ? t.library.allCategories : cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <TabsContent value="system" className="mt-0">
            {isLoading ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-white dark:bg-card rounded-2xl border border-black/[0.04] dark:border-border p-6">
                    <Skeleton className="w-14 h-14 rounded-2xl mb-5" />
                    <Skeleton className="h-6 w-3/4 mb-3" />
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-2/3 mb-4" />
                    <div className="flex gap-2">
                      <Skeleton className="h-6 w-16 rounded-full" />
                      <Skeleton className="h-6 w-20 rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredBlueprints?.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#A855F7]/10 to-[#EC4899]/10 flex items-center justify-center mx-auto mb-5">
                  <Layers className="w-8 h-8 text-[#A855F7]" />
                </div>
                <h3 className="text-lg font-semibold text-[#0F172A] dark:text-foreground mb-2">{t.library.noResults}</h3>
                <p className="text-[#64748B] dark:text-muted-foreground mb-5">Try adjusting your search or filters</p>
                <Button 
                  variant="outline" 
                  className="rounded-xl border-black/[0.08]"
                  onClick={() => { setSearch(""); setActiveCategory("all"); }}
                >
                  Clear filters
                </Button>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredBlueprints?.map((blueprint) => {
                  const IconComponent = categoryIcons[blueprint.category] || Sparkles;
                  return (
                    <div 
                      key={blueprint.id} 
                      className="group bg-white dark:bg-card rounded-2xl border border-black/[0.04] dark:border-border p-6 hover:border-[#A855F7]/20 hover:shadow-[0_8px_30px_rgba(168,85,247,0.08)] transition-all duration-200"
                      data-testid={`card-blueprint-${blueprint.id}`}
                    >
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#A855F7]/10 to-[#EC4899]/10 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform duration-200">
                        <IconComponent className="w-7 h-7 text-[#A855F7]" />
                      </div>
                      
                      <h3 className="text-lg font-semibold text-[#0F172A] dark:text-foreground mb-2 leading-snug">
                        {blueprint.name}
                      </h3>
                      
                      <p className="text-sm text-[#64748B] dark:text-muted-foreground line-clamp-2 mb-4 leading-relaxed">
                        {blueprint.description}
                      </p>
                      
                      <div className="flex flex-wrap gap-2 mb-5">
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#F1F5F9] dark:bg-muted text-[#64748B] dark:text-muted-foreground">
                          {blueprint.category}
                        </span>
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#F1F5F9] dark:bg-muted text-[#64748B] dark:text-muted-foreground">
                          {(blueprint.blocks as string[])?.length || 0} blocks
                        </span>
                      </div>
                      
                      <Link href={`/studio?blueprint=${blueprint.id}`} className="block">
                        <Button 
                          variant="ghost" 
                          className="w-full justify-between text-[#A855F7] hover:text-[#A855F7] hover:bg-[#A855F7]/5 rounded-xl group/btn"
                          data-testid={`button-use-blueprint-${blueprint.id}`}
                        >
                          <span className="font-medium">{t.library.useBlueprint}</span>
                          <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                        </Button>
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="my" className="mt-0">
            {loadingUserBlueprints ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="bg-white dark:bg-card rounded-2xl border border-black/[0.04] dark:border-border p-6">
                    <Skeleton className="w-14 h-14 rounded-2xl mb-5" />
                    <Skeleton className="h-6 w-3/4 mb-3" />
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                ))}
              </div>
            ) : filteredUserBlueprints?.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#A855F7]/10 to-[#EC4899]/10 flex items-center justify-center mx-auto mb-5">
                  <Sparkles className="w-8 h-8 text-[#A855F7]" />
                </div>
                <h3 className="text-lg font-semibold text-[#0F172A] dark:text-foreground mb-2">
                  {search || activeCategory !== "all" 
                    ? t.library.noResults 
                    : (t.blueprintBuilder?.noUserBlueprints || "No custom blueprints yet")}
                </h3>
                {!search && activeCategory === "all" && (
                  <p className="text-[#64748B] dark:text-muted-foreground mb-5">
                    {t.blueprintBuilder?.createFirstHint || "Create your first custom blueprint"}
                  </p>
                )}
                <Button 
                  className="bg-gradient-to-r from-[#A855F7] to-[#EC4899] hover:opacity-90 text-white border-0 rounded-xl"
                  onClick={search || activeCategory !== "all" ? () => { setSearch(""); setActiveCategory("all"); } : handleCreate}
                >
                  {search || activeCategory !== "all" ? "Clear filters" : (t.blueprintBuilder?.createNew || "Create New")}
                </Button>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredUserBlueprints?.map((blueprint) => {
                  const IconComponent = categoryIcons[blueprint.category] || User;
                  return (
                    <div 
                      key={blueprint.id} 
                      className="group bg-white dark:bg-card rounded-2xl border border-black/[0.04] dark:border-border p-6 hover:border-[#A855F7]/20 hover:shadow-[0_8px_30px_rgba(168,85,247,0.08)] transition-all duration-200"
                      data-testid={`card-user-blueprint-${blueprint.id}`}
                    >
                      <div className="flex items-start justify-between mb-5">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#A855F7]/10 to-[#EC4899]/10 flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
                          <IconComponent className="w-7 h-7 text-[#A855F7]" />
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 rounded-lg text-[#64748B] hover:text-[#0F172A] dark:hover:text-foreground"
                              data-testid={`button-menu-${blueprint.id}`}
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-xl border-black/[0.04] dark:border-border">
                            <DropdownMenuItem onClick={() => handleEdit(blueprint)} className="rounded-lg" data-testid={`button-edit-${blueprint.id}`}>
                              <Pencil className="w-4 h-4 mr-2" />
                              {t.blueprintBuilder?.edit || "Edit"}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => duplicateMutation.mutate(blueprint.id)} className="rounded-lg" data-testid={`button-duplicate-${blueprint.id}`}>
                              <Copy className="w-4 h-4 mr-2" />
                              {t.blueprintBuilder?.duplicate || "Duplicate"}
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDelete(blueprint)} 
                              className="rounded-lg text-red-500 focus:text-red-500"
                              data-testid={`button-delete-${blueprint.id}`}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              {t.blueprintBuilder?.delete || "Delete"}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold text-[#0F172A] dark:text-foreground leading-snug">
                          {blueprint.name}
                        </h3>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-[#F1F5F9] dark:bg-muted text-[#64748B]">
                          v{blueprint.version}
                        </span>
                      </div>
                      
                      <p className="text-sm text-[#64748B] dark:text-muted-foreground line-clamp-2 mb-4 leading-relaxed">
                        {blueprint.description || "No description"}
                      </p>
                      
                      <div className="flex flex-wrap gap-2 mb-5">
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#F1F5F9] dark:bg-muted text-[#64748B] dark:text-muted-foreground">
                          {blueprint.category}
                        </span>
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#F1F5F9] dark:bg-muted text-[#64748B] dark:text-muted-foreground">
                          {blueprint.blocks?.length || 0} blocks
                        </span>
                      </div>
                      
                      <Link href={`/studio?userBlueprint=${blueprint.id}`} className="block">
                        <Button 
                          variant="ghost" 
                          className="w-full justify-between text-[#A855F7] hover:text-[#A855F7] hover:bg-[#A855F7]/5 rounded-xl group/btn"
                          data-testid={`button-use-user-blueprint-${blueprint.id}`}
                        >
                          <span className="font-medium">{t.library.useBlueprint}</span>
                          <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                        </Button>
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <BlueprintBuilder 
        open={builderOpen} 
        onOpenChange={(open) => {
          setBuilderOpen(open);
          if (!open) setEditingBlueprint(null);
        }}
        editData={editingBlueprint}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-2xl border-black/[0.04] dark:border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#0F172A] dark:text-foreground">{t.blueprintBuilder?.delete || "Delete"}</AlertDialogTitle>
            <AlertDialogDescription className="text-[#64748B]">
              {t.blueprintBuilder?.confirmDelete || "Are you sure you want to delete this blueprint?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl border-black/[0.08]" data-testid="button-cancel-delete">
              {t.common?.cancel || "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-red-500 hover:bg-red-600 text-white rounded-xl"
              data-testid="button-confirm-delete"
            >
              {t.blueprintBuilder?.delete || "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

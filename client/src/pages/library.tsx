import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
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
    <div className="min-h-screen bg-black text-white selection:bg-white/20">
      {/* Minimal Grid Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-[0.02]">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)
            `,
            backgroundSize: "60px 60px"
          }}
        />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 pt-24 pb-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white tracking-tight">{t.library.title}</h1>
          <p className="text-white/40 text-sm mt-1">{t.library.subtitle}</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          {/* Tabs Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <TabsList className="bg-white/5 border border-white/10 p-1 rounded-lg">
              <TabsTrigger
                value="system"
                className="rounded-md px-4 py-2 text-xs font-medium text-white/60 data-[state=active]:bg-white data-[state=active]:text-black"
                data-testid="tab-system-blueprints"
              >
                {t.blueprintBuilder?.systemBlueprints || "System Blueprints"}
              </TabsTrigger>
              <TabsTrigger
                value="my"
                className="rounded-md px-4 py-2 text-xs font-medium text-white/60 data-[state=active]:bg-white data-[state=active]:text-black"
                data-testid="tab-my-blueprints"
              >
                {t.blueprintBuilder?.myBlueprints || "My Blueprints"}
                {userBlueprints && userBlueprints.length > 0 && (
                  <span className="ml-2 px-1.5 py-0.5 text-[10px] rounded bg-white/10 text-white/60">
                    {userBlueprints.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            {activeTab === "my" && (
              <Button
                onClick={handleCreate}
                className="gap-2 bg-white text-black hover:bg-white/90 h-9 text-xs font-medium"
                data-testid="button-create-blueprint"
              >
                <Plus className="w-3.5 h-3.5" />
                {t.blueprintBuilder?.createNew || "Create New"}
              </Button>
            )}
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <Input
                placeholder={t.library.searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-9 text-sm rounded-lg bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-white/30"
                data-testid="input-search"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`
                    px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150
                    ${activeCategory === cat
                      ? "bg-white text-black"
                      : "bg-white/5 text-white/40 hover:text-white hover:bg-white/10 border border-white/10"
                    }
                  `}
                  data-testid={`button-category-${cat}`}
                >
                  {cat === "all" ? t.library.allCategories : cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* System Blueprints Tab */}
          <TabsContent value="system" className="mt-0">
            {isLoading ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="p-5 rounded-xl border border-white/10 bg-white/[0.02]">
                    <Skeleton className="w-10 h-10 rounded-lg mb-4 bg-white/10" />
                    <Skeleton className="h-5 w-3/4 mb-2 bg-white/10" />
                    <Skeleton className="h-3 w-full mb-1 bg-white/5" />
                    <Skeleton className="h-3 w-2/3 bg-white/5" />
                  </div>
                ))}
              </div>
            ) : filteredBlueprints?.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Layers className="w-12 h-12 text-white/10 mb-4" />
                <h3 className="text-lg font-medium text-white/60 mb-2">{t.library.noResults}</h3>
                <p className="text-sm text-white/30 mb-4">Try adjusting your search or filters</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs border-white/10 text-white/60 hover:text-white hover:bg-white/5"
                  onClick={() => { setSearch(""); setActiveCategory("all"); }}
                >
                  Clear filters
                </Button>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredBlueprints?.map((blueprint) => {
                  const IconComponent = categoryIcons[blueprint.category] || Sparkles;
                  return (
                    <div
                      key={blueprint.id}
                      className="group p-5 rounded-xl border border-white/10 bg-white/[0.02] hover:border-white/20 transition-all duration-300"
                    >
                      <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center mb-4 group-hover:bg-white/10 transition-all">
                        <IconComponent className="w-5 h-5 text-white/30 group-hover:text-white/60" />
                      </div>

                      <h3 className="text-sm font-semibold mb-1 text-white group-hover:text-white transition-colors">
                        {blueprint.name}
                      </h3>

                      <p className="text-xs text-white/40 line-clamp-2 mb-4 leading-relaxed">
                        {blueprint.description}
                      </p>

                      <div className="flex flex-wrap gap-1.5 mb-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/5 text-white/40 border border-white/10">
                          {blueprint.category}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/5 text-white/40 border border-white/10">
                          {(blueprint.blocks as string[])?.length || 0} blocks
                        </span>
                      </div>

                      <Link href={`/image-studio?blueprint=${blueprint.id}`} className="block">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-between h-8 text-xs text-white/60 hover:text-white hover:bg-white/5"
                          data-testid={`button-use-blueprint-${blueprint.id}`}
                        >
                          <span>{t.library.useBlueprint}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Button>
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* User Blueprints Tab */}
          <TabsContent value="my" className="mt-0">
            {loadingUserBlueprints ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="p-5 rounded-xl border border-white/10 bg-white/[0.02]">
                    <Skeleton className="w-10 h-10 rounded-lg mb-4 bg-white/10" />
                    <Skeleton className="h-5 w-3/4 mb-2 bg-white/10" />
                    <Skeleton className="h-3 w-full bg-white/5" />
                  </div>
                ))}
              </div>
            ) : filteredUserBlueprints?.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Sparkles className="w-12 h-12 text-white/10 mb-4" />
                <h3 className="text-lg font-medium text-white/60 mb-2">
                  {search || activeCategory !== "all"
                    ? t.library.noResults
                    : (t.blueprintBuilder?.noUserBlueprints || "No custom blueprints yet")}
                </h3>
                <p className="text-sm text-white/30 mb-4">
                  {!search && activeCategory === "all"
                    ? (t.blueprintBuilder?.createFirstHint || "Create your first custom blueprint")
                    : "Try adjusting filters"}
                </p>
                <Button
                  size="sm"
                  className="text-xs bg-white text-black hover:bg-white/90"
                  onClick={search || activeCategory !== "all"
                    ? () => { setSearch(""); setActiveCategory("all"); }
                    : handleCreate}
                >
                  {search || activeCategory !== "all" ? "Clear filters" : (t.blueprintBuilder?.createNew || "Create New")}
                </Button>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredUserBlueprints?.map((blueprint) => {
                  const IconComponent = categoryIcons[blueprint.category] || User;
                  return (
                    <div
                      key={blueprint.id}
                      className="group p-5 rounded-xl border border-white/10 bg-white/[0.02] hover:border-white/20 transition-all duration-300"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-all">
                          <IconComponent className="w-5 h-5 text-white/30 group-hover:text-white/60" />
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 rounded-lg text-white/30 hover:text-white hover:bg-white/10"
                              data-testid={`button-menu-${blueprint.id}`}
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-lg bg-black border-white/10">
                            <DropdownMenuItem
                              onClick={() => handleEdit(blueprint)}
                              className="text-xs text-white/60 hover:text-white focus:bg-white/10"
                              data-testid={`button-edit-${blueprint.id}`}
                            >
                              <Pencil className="w-3.5 h-3.5 mr-2" />
                              {t.blueprintBuilder?.edit || "Edit"}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => duplicateMutation.mutate(blueprint.id)}
                              className="text-xs text-white/60 hover:text-white focus:bg-white/10"
                              data-testid={`button-duplicate-${blueprint.id}`}
                            >
                              <Copy className="w-3.5 h-3.5 mr-2" />
                              {t.blueprintBuilder?.duplicate || "Duplicate"}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(blueprint)}
                              className="text-xs text-red-400 focus:text-red-400 focus:bg-red-500/10"
                              data-testid={`button-delete-${blueprint.id}`}
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-2" />
                              {t.blueprintBuilder?.delete || "Delete"}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-semibold text-white group-hover:text-white transition-colors">
                          {blueprint.name}
                        </h3>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-white/5 text-white/30 border border-white/10">
                          v{blueprint.version}
                        </span>
                      </div>

                      <p className="text-xs text-white/40 line-clamp-2 mb-4 leading-relaxed">
                        {blueprint.description || "No description"}
                      </p>

                      <div className="flex flex-wrap gap-1.5 mb-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/5 text-white/40 border border-white/10">
                          {blueprint.category}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/5 text-white/40 border border-white/10">
                          {blueprint.blocks?.length || 0} blocks
                        </span>
                      </div>

                      <Link href={`/image-studio?userBlueprint=${blueprint.id}`} className="block">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-between h-8 text-xs text-white/60 hover:text-white hover:bg-white/5"
                          data-testid={`button-use-user-blueprint-${blueprint.id}`}
                        >
                          <span>{t.library.useBlueprint}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Button>
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-white/5 text-center">
          <p className="text-[10px] text-white/20 uppercase tracking-[0.2em]">
            © 2025 VECTRA AI
          </p>
        </footer>
      </div>

      {/* Blueprint Builder Modal */}
      <BlueprintBuilder
        open={builderOpen}
        onOpenChange={(open) => {
          setBuilderOpen(open);
          if (!open) setEditingBlueprint(null);
        }}
        editData={editingBlueprint}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-xl bg-black border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white text-sm font-semibold">
              {t.blueprintBuilder?.delete || "Delete"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-white/40 text-xs">
              {t.blueprintBuilder?.confirmDelete || "Are you sure you want to delete this blueprint?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="h-8 text-xs rounded-lg bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white"
              data-testid="button-cancel-delete"
            >
              {t.common?.cancel || "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="h-8 text-xs bg-red-500 hover:bg-red-600 text-white rounded-lg"
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

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Search, ArrowRight, Layers, Grid3X3, Camera, Tv, Palette, Gamepad2, Frame, Monitor, Plus, MoreVertical, Pencil, Copy, Trash2, User } from "lucide-react";

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
  product: Layers,
  portrait: User,
  scene: Palette,
  technical: Monitor,
};

const categories = ["all", "aesthetic", "layout", "surveillance", "retro", "gaming", "fashion", "ui", "custom", "product", "portrait", "scene", "technical"];

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
    <div className="min-h-screen pt-14 bg-background">
      <div className="max-w-6xl mx-auto px-6 md:px-8 py-10">
        <div className="mb-10">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight mb-2" data-testid="text-library-title">
            {t.library.title}
          </h1>
          <p className="text-muted-foreground">{t.library.subtitle}</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <TabsList className="bg-secondary/50">
              <TabsTrigger value="system" className="rounded-lg" data-testid="tab-system-blueprints">
                {t.blueprintBuilder?.systemBlueprints || "System Blueprints"}
              </TabsTrigger>
              <TabsTrigger value="my" className="rounded-lg" data-testid="tab-my-blueprints">
                {t.blueprintBuilder?.myBlueprints || "My Blueprints"}
                {userBlueprints && userBlueprints.length > 0 && (
                  <Badge variant="secondary" className="ml-2 text-xs">{userBlueprints.length}</Badge>
                )}
              </TabsTrigger>
            </TabsList>
            
            {activeTab === "my" && (
              <Button onClick={handleCreate} className="gap-2 rounded-xl" data-testid="button-create-blueprint">
                <Plus className="w-4 h-4" />
                {t.blueprintBuilder?.createNew || "Create New"}
              </Button>
            )}
          </div>

          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t.library.searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-10 rounded-xl bg-card border-border/50"
                data-testid="input-search"
              />
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {categories.slice(0, 6).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`
                    px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-150
                    ${activeCategory === cat 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary"
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
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="bg-card border-border/50 overflow-hidden">
                    <Skeleton className="h-36" />
                    <CardHeader className="p-5 pb-3">
                      <Skeleton className="h-5 w-3/4" />
                    </CardHeader>
                    <CardContent className="p-5 pt-0">
                      <Skeleton className="h-4 w-full mb-2" />
                      <Skeleton className="h-4 w-2/3" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredBlueprints?.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-5">
                  <Layers className="w-7 h-7 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-2">{t.library.noResults}</h3>
                <Button variant="outline" className="rounded-xl" onClick={() => { setSearch(""); setActiveCategory("all"); }}>
                  Clear filters
                </Button>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredBlueprints?.map((blueprint) => {
                  const IconComponent = categoryIcons[blueprint.category] || Layers;
                  return (
                    <Card key={blueprint.id} className="group bg-card border-border/50 overflow-hidden" data-testid={`card-blueprint-${blueprint.id}`}>
                      <div className="h-32 bg-gradient-to-br from-accent/40 via-accent/20 to-transparent flex items-center justify-center relative">
                        <IconComponent className="w-10 h-10 text-primary/40 group-hover:scale-110 transition-transform duration-200" />
                      </div>
                      <CardHeader className="p-5 pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-base font-semibold leading-snug">{blueprint.name}</CardTitle>
                          <Badge variant="secondary" className="shrink-0 text-xs">
                            {blueprint.category}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="p-5 pt-0 pb-3">
                        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                          {blueprint.description}
                        </p>
                        <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                          <span>{(blueprint.blocks as string[])?.length || 0} {t.library.blocks}</span>
                        </div>
                      </CardContent>
                      <CardFooter className="p-5 pt-0">
                        <Link href={`/studio?blueprint=${blueprint.id}`} className="w-full">
                          <Button variant="outline" className="w-full gap-2 rounded-xl" data-testid={`button-use-blueprint-${blueprint.id}`}>
                            {t.library.useBlueprint}
                            <ArrowRight className="w-4 h-4" />
                          </Button>
                        </Link>
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="my" className="mt-0">
            {loadingUserBlueprints ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                {[...Array(3)].map((_, i) => (
                  <Card key={i} className="bg-card border-border/50 overflow-hidden">
                    <Skeleton className="h-36" />
                    <CardHeader className="p-5 pb-3">
                      <Skeleton className="h-5 w-3/4" />
                    </CardHeader>
                    <CardContent className="p-5 pt-0">
                      <Skeleton className="h-4 w-full mb-2" />
                      <Skeleton className="h-4 w-2/3" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredUserBlueprints?.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-5">
                  <Layers className="w-7 h-7 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-2">
                  {search || activeCategory !== "all" 
                    ? t.library.noResults 
                    : (t.blueprintBuilder?.noUserBlueprints || "No custom blueprints yet")}
                </h3>
                {!search && activeCategory === "all" && (
                  <p className="text-sm text-muted-foreground mb-5">
                    {t.blueprintBuilder?.createFirstHint || "Create your first custom blueprint"}
                  </p>
                )}
                <Button 
                  className="rounded-xl"
                  onClick={search || activeCategory !== "all" ? () => { setSearch(""); setActiveCategory("all"); } : handleCreate}
                >
                  {search || activeCategory !== "all" ? "Clear filters" : (t.blueprintBuilder?.createNew || "Create New")}
                </Button>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredUserBlueprints?.map((blueprint) => {
                  const IconComponent = categoryIcons[blueprint.category] || User;
                  return (
                    <Card key={blueprint.id} className="group bg-card border-border/50 overflow-hidden" data-testid={`card-user-blueprint-${blueprint.id}`}>
                      <div className="h-32 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent flex items-center justify-center relative">
                        <IconComponent className="w-10 h-10 text-primary/40 group-hover:scale-110 transition-transform duration-200" />
                        <Badge variant="outline" className="absolute top-3 right-3 text-xs bg-background/80 backdrop-blur">
                          v{blueprint.version}
                        </Badge>
                      </div>
                      <CardHeader className="p-5 pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-base font-semibold leading-snug">{blueprint.name}</CardTitle>
                          <div className="flex items-center gap-1">
                            <Badge variant="secondary" className="shrink-0 text-xs">
                              {blueprint.category}
                            </Badge>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" data-testid={`button-menu-${blueprint.id}`}>
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="rounded-xl">
                                <DropdownMenuItem onClick={() => handleEdit(blueprint)} data-testid={`button-edit-${blueprint.id}`}>
                                  <Pencil className="w-4 h-4 mr-2" />
                                  {t.blueprintBuilder?.edit || "Edit"}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => duplicateMutation.mutate(blueprint.id)} data-testid={`button-duplicate-${blueprint.id}`}>
                                  <Copy className="w-4 h-4 mr-2" />
                                  {t.blueprintBuilder?.duplicate || "Duplicate"}
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleDelete(blueprint)} 
                                  className="text-destructive focus:text-destructive"
                                  data-testid={`button-delete-${blueprint.id}`}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  {t.blueprintBuilder?.delete || "Delete"}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-5 pt-0 pb-3">
                        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                          {blueprint.description || "No description"}
                        </p>
                        <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                          <span>{blueprint.blocks?.length || 0} {t.library.blocks}</span>
                        </div>
                      </CardContent>
                      <CardFooter className="p-5 pt-0">
                        <Link href={`/studio?userBlueprint=${blueprint.id}`} className="w-full">
                          <Button variant="outline" className="w-full gap-2 rounded-xl" data-testid={`button-use-user-blueprint-${blueprint.id}`}>
                            {t.library.useBlueprint}
                            <ArrowRight className="w-4 h-4" />
                          </Button>
                        </Link>
                      </CardFooter>
                    </Card>
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
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t.blueprintBuilder?.delete || "Delete"}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.blueprintBuilder?.confirmDelete || "Are you sure you want to delete this blueprint?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl" data-testid="button-cancel-delete">
              {t.common?.cancel || "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
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

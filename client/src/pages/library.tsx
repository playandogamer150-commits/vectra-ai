import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { PromptBlueprint } from "@shared/schema";
import { Search, ArrowRight, Layers, Grid3X3, Camera, Tv, Palette, Gamepad2, Frame, Monitor } from "lucide-react";

const categoryIcons: Record<string, React.ElementType> = {
  aesthetic: Palette,
  layout: Grid3X3,
  surveillance: Camera,
  retro: Tv,
  gaming: Gamepad2,
  fashion: Frame,
  ui: Monitor,
};

const categories = ["all", "aesthetic", "layout", "surveillance", "retro", "gaming", "fashion", "ui"];

export default function LibraryPage() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  const { data: blueprints, isLoading } = useQuery<PromptBlueprint[]>({
    queryKey: ["/api/blueprints"],
  });

  const filteredBlueprints = blueprints?.filter((bp) => {
    const matchesSearch = bp.name.toLowerCase().includes(search.toLowerCase()) ||
      bp.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === "all" || bp.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen pt-16">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold mb-2" data-testid="text-library-title">Blueprint Library</h1>
          <p className="text-muted-foreground">Explore pre-built prompt templates for any creative need</p>
        </div>

        <div className="sticky top-16 z-40 bg-background/80 backdrop-blur-md -mx-4 md:-mx-8 px-4 md:px-8 py-4 border-b border-border mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search blueprints..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
                data-testid="input-search"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {categories.map((cat) => (
                <Button
                  key={cat}
                  variant={activeCategory === cat ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveCategory(cat)}
                  data-testid={`button-category-${cat}`}
                >
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <Skeleton className="h-40 rounded-t-lg" />
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredBlueprints?.length === 0 ? (
          <div className="text-center py-16">
            <Layers className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No blueprints found</h3>
            <p className="text-muted-foreground mb-4">Try adjusting your search or category filter</p>
            <Button variant="outline" onClick={() => { setSearch(""); setActiveCategory("all"); }}>
              Clear filters
            </Button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBlueprints?.map((blueprint) => {
              const IconComponent = categoryIcons[blueprint.category] || Layers;
              return (
                <Card key={blueprint.id} className="group overflow-visible" data-testid={`card-blueprint-${blueprint.id}`}>
                  <div className="aspect-video bg-gradient-to-br from-primary/10 via-primary/5 to-transparent flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                    <IconComponent className="w-12 h-12 text-primary/30 group-hover:scale-110 transition-transform" />
                  </div>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-lg leading-tight">{blueprint.name}</CardTitle>
                      <Badge variant="secondary" className="shrink-0">
                        {blueprint.category}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-2">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {blueprint.description}
                    </p>
                    <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                      <span>{(blueprint.blocks as string[])?.length || 0} blocks</span>
                      <span>{(blueprint.constraints as string[])?.length || 0} constraints</span>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Link href={`/studio?blueprint=${blueprint.id}`} className="w-full">
                      <Button variant="outline" className="w-full gap-2" data-testid={`button-use-blueprint-${blueprint.id}`}>
                        Use Blueprint
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </Link>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

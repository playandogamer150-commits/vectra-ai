import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { PromptBlock, LlmProfile } from "@shared/schema";
import { Plus, X, GripVertical, Save, Loader2 } from "lucide-react";

interface UserBlueprintData {
  id?: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  blocks: string[];
  constraints: Record<string, unknown>;
  compatibleProfiles: string[];
}

interface BlueprintBuilderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editData?: UserBlueprintData | null;
  onSuccess?: () => void;
}

const CATEGORIES = [
  { id: "aesthetic", label: "Aesthetic" },
  { id: "product", label: "Product" },
  { id: "portrait", label: "Portrait" },
  { id: "scene", label: "Scene" },
  { id: "technical", label: "Technical" },
  { id: "custom", label: "Custom" },
];

export function BlueprintBuilder({ open, onOpenChange, editData, onSuccess }: BlueprintBuilderProps) {
  const { toast } = useToast();
  const { t } = useI18n();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("custom");
  const [selectedBlocks, setSelectedBlocks] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [compatibleProfiles, setCompatibleProfiles] = useState<string[]>([]);

  const { data: blocks, isLoading: loadingBlocks } = useQuery<PromptBlock[]>({
    queryKey: ["/api/blocks"],
  });

  const { data: profiles } = useQuery<LlmProfile[]>({
    queryKey: ["/api/profiles"],
  });

  useEffect(() => {
    if (editData) {
      setName(editData.name);
      setDescription(editData.description || "");
      setCategory(editData.category);
      setSelectedBlocks(editData.blocks);
      setTags(editData.tags || []);
      setCompatibleProfiles(editData.compatibleProfiles || []);
    } else {
      setName("");
      setDescription("");
      setCategory("custom");
      setSelectedBlocks([]);
      setTags([]);
      setCompatibleProfiles([]);
    }
  }, [editData, open]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const endpoint = editData?.id 
        ? `/api/user-blueprints/${editData.id}` 
        : "/api/user-blueprints";
      const method = editData?.id ? "PATCH" : "POST";
      
      const res = await apiRequest(method, endpoint, {
        name,
        description,
        category,
        blocks: selectedBlocks,
        tags,
        constraints: {},
        compatibleProfiles,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ 
        title: editData?.id 
          ? (t.blueprintBuilder?.updated || "Blueprint updated") 
          : (t.blueprintBuilder?.created || "Blueprint created") 
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user-blueprints"] });
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({ 
        title: t.blueprintBuilder?.error || "Error", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  const handleAddBlock = (blockKey: string) => {
    if (!selectedBlocks.includes(blockKey)) {
      setSelectedBlocks([...selectedBlocks, blockKey]);
    }
  };

  const handleRemoveBlock = (blockKey: string) => {
    setSelectedBlocks(selectedBlocks.filter(b => b !== blockKey));
  };

  const handleMoveBlock = (index: number, direction: "up" | "down") => {
    const newBlocks = [...selectedBlocks];
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex >= 0 && newIndex < newBlocks.length) {
      [newBlocks[index], newBlocks[newIndex]] = [newBlocks[newIndex], newBlocks[index]];
      setSelectedBlocks(newBlocks);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const handleToggleProfile = (profileId: string) => {
    if (compatibleProfiles.includes(profileId)) {
      setCompatibleProfiles(compatibleProfiles.filter(p => p !== profileId));
    } else {
      setCompatibleProfiles([...compatibleProfiles, profileId]);
    }
  };

  const canSave = name.trim() && selectedBlocks.length > 0;

  const getBlockByKey = (key: string) => blocks?.find(b => b.key === key);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle data-testid="text-builder-title">
            {editData?.id 
              ? (t.blueprintBuilder?.editTitle || "Edit Blueprint") 
              : (t.blueprintBuilder?.createTitle || "Create Blueprint")}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden grid lg:grid-cols-2 gap-6">
          <div className="space-y-4 overflow-y-auto pr-2">
            <div className="space-y-2">
              <Label htmlFor="bp-name">{t.blueprintBuilder?.name || "Name"}</Label>
              <Input
                id="bp-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t.blueprintBuilder?.namePlaceholder || "My Custom Blueprint"}
                data-testid="input-blueprint-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bp-description">{t.blueprintBuilder?.description || "Description"}</Label>
              <Textarea
                id="bp-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t.blueprintBuilder?.descriptionPlaceholder || "Describe what this blueprint generates..."}
                className="min-h-20"
                data-testid="input-blueprint-description"
              />
            </div>

            <div className="space-y-2">
              <Label>{t.blueprintBuilder?.category || "Category"}</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger data-testid="select-blueprint-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t.blueprintBuilder?.tags || "Tags"}</Label>
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder={t.blueprintBuilder?.tagPlaceholder || "Add tag..."}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddTag())}
                  data-testid="input-blueprint-tag"
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  size="icon" 
                  onClick={handleAddTag}
                  data-testid="button-add-tag"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="gap-1">
                      {tag}
                      <button 
                        onClick={() => handleRemoveTag(tag)}
                        className="hover:text-destructive"
                        data-testid={`button-remove-tag-${tag}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>{t.blueprintBuilder?.compatibleProfiles || "Compatible Profiles"}</Label>
              <div className="flex flex-wrap gap-2">
                {profiles?.map(profile => (
                  <Button
                    key={profile.id}
                    type="button"
                    variant={compatibleProfiles.includes(profile.id) ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleToggleProfile(profile.id)}
                    data-testid={`button-profile-compat-${profile.id}`}
                  >
                    {profile.name}
                  </Button>
                ))}
              </div>
              {compatibleProfiles.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  {t.blueprintBuilder?.allProfilesHint || "Leave empty to support all profiles"}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-4 overflow-hidden flex flex-col">
            <div className="flex-1 space-y-3 overflow-hidden">
              <Label>{t.blueprintBuilder?.selectedBlocks || "Selected Blocks"} ({selectedBlocks.length})</Label>
              
              {selectedBlocks.length === 0 ? (
                <div className="p-4 rounded-lg border border-dashed text-center text-muted-foreground text-sm">
                  {t.blueprintBuilder?.noBlocksHint || "Add blocks from below to define your blueprint structure"}
                </div>
              ) : (
                <ScrollArea className="h-[180px] border rounded-lg p-2">
                  <div className="space-y-1">
                    {selectedBlocks.map((blockKey, index) => {
                      const block = getBlockByKey(blockKey);
                      return (
                        <div
                          key={blockKey}
                          className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 border"
                        >
                          <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">{block?.key || blockKey}</div>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              disabled={index === 0}
                              onClick={() => handleMoveBlock(index, "up")}
                              data-testid={`button-move-up-${blockKey}`}
                            >
                              <span className="sr-only">Move up</span>
                              <span className="text-xs">&#9650;</span>
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              disabled={index === selectedBlocks.length - 1}
                              onClick={() => handleMoveBlock(index, "down")}
                              data-testid={`button-move-down-${blockKey}`}
                            >
                              <span className="sr-only">Move down</span>
                              <span className="text-xs">&#9660;</span>
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-destructive"
                              onClick={() => handleRemoveBlock(blockKey)}
                              data-testid={`button-remove-block-${blockKey}`}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}

              <Label>{t.blueprintBuilder?.availableBlocks || "Available Blocks"}</Label>
              {loadingBlocks ? (
                <div className="text-sm text-muted-foreground">{t.blueprintBuilder?.loading || "Loading..."}</div>
              ) : (
                <ScrollArea className="h-[200px] border rounded-lg p-2">
                  <div className="grid grid-cols-2 gap-1">
                    {blocks?.filter(b => !selectedBlocks.includes(b.key)).map(block => (
                      <button
                        key={block.id}
                        type="button"
                        onClick={() => handleAddBlock(block.key)}
                        className="text-left p-2 rounded-lg border hover-elevate active-elevate-2 transition-colors"
                        data-testid={`button-add-block-${block.key}`}
                      >
                        <div className="font-medium text-sm truncate">{block.key}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {typeof block.template === 'string' 
                            ? block.template.slice(0, 50) 
                            : JSON.stringify(block.template).slice(0, 50)}...
                        </div>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4 pt-4 border-t">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            data-testid="button-cancel-blueprint"
          >
            {t.blueprintBuilder?.cancel || "Cancel"}
          </Button>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={!canSave || createMutation.isPending}
            data-testid="button-save-blueprint"
          >
            {createMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {editData?.id 
              ? (t.blueprintBuilder?.update || "Update") 
              : (t.blueprintBuilder?.save || "Save Blueprint")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

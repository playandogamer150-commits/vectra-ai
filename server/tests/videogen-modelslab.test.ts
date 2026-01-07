import { describe, expect, it } from "vitest";
import { ModelsLabProvider } from "../videogen/providers/modelslab";

describe("videogen ModelsLabProvider (Seedance/Veo)", () => {
  it("rejects Veo 3.1 durations > 8s (16:9)", async () => {
    const provider = new ModelsLabProvider("test-key");
    const result = await provider.createJob({
      userId: "u1",
      sourceImageUrl: undefined,
      prompt: "test",
      targetAspect: "16:9",
      durationSeconds: 10,
      modelId: "veo-3.1",
      generateAudio: false,
      generationType: "image-to-video",
    });
    expect(result.success).toBe(false);
    expect(result.status).toBe("error");
    expect(result.error).toMatch(/Allowed: 2s–8s/);
  });

  it("allows Seedance 1.5 Pro durations up to 25s (9:16)", async () => {
    const provider = new ModelsLabProvider("test-key");
    // We don't want to hit the network in unit tests; we validate the duration gate and then
    // expect the next validation (missing image URL) to trigger instead.
    const result = await provider.createJob({
      userId: "u1",
      sourceImageUrl: undefined,
      prompt: "test",
      targetAspect: "9:16",
      durationSeconds: 25,
      modelId: "seedance-1-5-pro",
      generateAudio: false,
      generationType: "image-to-video",
    });
    expect(result.success).toBe(false);
    expect(result.status).toBe("error");
    expect(result.error).toMatch(/Source image URL is required/i);
  });
});



import { createHmac, randomBytes } from "crypto";
import path from "path";
import fs from "fs/promises";

export interface StorageProvider {
  getPresignedUploadUrl(key: string, expiresIn?: number): Promise<{ uploadUrl: string; publicUrl: string }>;
  getPresignedDownloadUrl(key: string, expiresIn?: number): Promise<string>;
  deleteObject(key: string): Promise<void>;
}

class LocalStorageProvider implements StorageProvider {
  private basePath: string;
  private baseUrl: string;

  constructor() {
    this.basePath = path.join(process.cwd(), "uploads");
    this.baseUrl = process.env.REPLIT_DEV_DOMAIN 
      ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
      : "http://localhost:5000";
  }

  async ensureDir(filePath: string) {
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
  }

  async getPresignedUploadUrl(key: string, _expiresIn?: number): Promise<{ uploadUrl: string; publicUrl: string }> {
    const fullPath = path.join(this.basePath, key);
    await this.ensureDir(fullPath);
    
    const token = randomBytes(16).toString("hex");
    const uploadUrl = `${this.baseUrl}/api/upload/${encodeURIComponent(key)}?token=${token}`;
    const publicUrl = `${this.baseUrl}/uploads/${key}`;
    
    return { uploadUrl, publicUrl };
  }

  async getPresignedDownloadUrl(key: string, _expiresIn?: number): Promise<string> {
    return `${this.baseUrl}/uploads/${key}`;
  }

  async deleteObject(key: string): Promise<void> {
    const fullPath = path.join(this.basePath, key);
    try {
      await fs.unlink(fullPath);
    } catch (error) {
      console.warn(`Failed to delete ${key}:`, error);
    }
  }
}

class S3StorageProvider implements StorageProvider {
  private bucket: string;
  private region: string;
  private accessKey: string;
  private secretKey: string;

  constructor() {
    this.bucket = process.env.STORAGE_BUCKET || "";
    this.region = process.env.STORAGE_REGION || "us-east-1";
    this.accessKey = process.env.STORAGE_ACCESS_KEY || "";
    this.secretKey = process.env.STORAGE_SECRET_KEY || "";
  }

  async getPresignedUploadUrl(key: string, expiresIn = 3600): Promise<{ uploadUrl: string; publicUrl: string }> {
    const uploadUrl = await this.generatePresignedUrl(key, "PUT", expiresIn);
    const publicUrl = `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
    return { uploadUrl, publicUrl };
  }

  async getPresignedDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
    return this.generatePresignedUrl(key, "GET", expiresIn);
  }

  async deleteObject(key: string): Promise<void> {
    console.log(`S3 delete not fully implemented: ${key}`);
  }

  private async generatePresignedUrl(key: string, method: string, expiresIn: number): Promise<string> {
    const now = new Date();
    const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, "");
    const amzDate = dateStamp + "T" + now.toISOString().slice(11, 19).replace(/:/g, "") + "Z";
    
    const credential = `${this.accessKey}/${dateStamp}/${this.region}/s3/aws4_request`;
    
    const queryParams = new URLSearchParams({
      "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
      "X-Amz-Credential": credential,
      "X-Amz-Date": amzDate,
      "X-Amz-Expires": String(expiresIn),
      "X-Amz-SignedHeaders": "host",
    });

    const host = `${this.bucket}.s3.${this.region}.amazonaws.com`;
    const canonicalUri = `/${key}`;
    const canonicalQueryString = queryParams.toString();
    const canonicalHeaders = `host:${host}\n`;
    const signedHeaders = "host";
    const payloadHash = "UNSIGNED-PAYLOAD";

    const canonicalRequest = [
      method,
      canonicalUri,
      canonicalQueryString,
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join("\n");

    const hashedCanonicalRequest = createHmac("sha256", canonicalRequest).digest("hex");
    const stringToSign = [
      "AWS4-HMAC-SHA256",
      amzDate,
      `${dateStamp}/${this.region}/s3/aws4_request`,
      hashedCanonicalRequest,
    ].join("\n");

    const signingKey = this.getSignatureKey(this.secretKey, dateStamp, this.region, "s3");
    const signature = createHmac("sha256", signingKey).update(stringToSign).digest("hex");

    queryParams.set("X-Amz-Signature", signature);
    
    return `https://${host}${canonicalUri}?${queryParams.toString()}`;
  }

  private getSignatureKey(key: string, dateStamp: string, region: string, service: string): Buffer {
    const kDate = createHmac("sha256", `AWS4${key}`).update(dateStamp).digest();
    const kRegion = createHmac("sha256", kDate).update(region).digest();
    const kService = createHmac("sha256", kRegion).update(service).digest();
    const kSigning = createHmac("sha256", kService).update("aws4_request").digest();
    return kSigning;
  }
}

export function getStorageProvider(): StorageProvider {
  const provider = process.env.STORAGE_PROVIDER || "local";
  
  switch (provider) {
    case "s3":
    case "r2":
      return new S3StorageProvider();
    case "local":
    default:
      return new LocalStorageProvider();
  }
}

export const storageProvider = getStorageProvider();

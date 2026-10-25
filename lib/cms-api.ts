import { apiClient } from "@/lib/api-client";

export interface HeroStatItem {
  id: string;
  value: string;
  label: string;
  subtext?: string;
}

export interface HeroShowcaseCard {
  id: string;
  title: string;
  country: string;
  departure: string;
  image: string;
  tag?: string;
}

export interface HeroConfigData {
  id?: string;
  kicker: string;
  headline: string;
  highlight_word: string;
  subheadline: string;
  stats: HeroStatItem[];
  showcase_cards: HeroShowcaseCard[];
}

export interface GalleryItemData {
  id: string;
  title: string;
  destination: string;
  image_url: string;
  tour_date?: string;
  caption?: string;
  display_order?: number;
  is_active?: boolean;
  created_at?: string;
}

export interface ArticleItemData {
  id: string;
  slug: string;
  title: string;
  category: string;
  author_desk: string;
  summary: string;
  content?: string;
  banner_image_url?: string;
  read_time?: string;
  is_published?: boolean;
  published_at?: string;
  created_at?: string;
}

export interface WebPublishPayload {
  is_published_web?: boolean;
  is_featured_web?: boolean;
  web_badge?: string;
  web_hero_image?: string;
  web_overview?: string;
  web_departure_hubs?: string[];
}

export const cmsApi = {
  // Hero Configuration
  async getHero(): Promise<HeroConfigData> {
    return apiClient.get<HeroConfigData>("cms/admin/hero");
  },

  async updateHero(payload: Partial<HeroConfigData>): Promise<HeroConfigData> {
    return apiClient.put<HeroConfigData>("cms/admin/hero", payload);
  },

  // Delegation Photo Gallery
  async listGallery(): Promise<GalleryItemData[]> {
    return apiClient.get<GalleryItemData[]>("cms/admin/gallery");
  },

  async createGalleryItem(payload: Partial<GalleryItemData>): Promise<{ success: boolean; id: string; message: string }> {
    return apiClient.post("cms/admin/gallery", payload);
  },

  async updateGalleryItem(id: string, payload: Partial<GalleryItemData>): Promise<{ success: boolean; id: string; message: string }> {
    return apiClient.put(`cms/admin/gallery/${encodeURIComponent(id)}`, payload);
  },

  async deleteGalleryItem(id: string): Promise<{ success: boolean; id: string; message: string }> {
    return apiClient.delete(`cms/admin/gallery/${encodeURIComponent(id)}`);
  },

  // Travel Insights & Visa Articles
  async listArticles(category?: string): Promise<ArticleItemData[]> {
    return apiClient.get<ArticleItemData[]>("cms/admin/articles", {
      params: category ? { category } : undefined,
    });
  },

  async getArticle(id: string): Promise<ArticleItemData> {
    return apiClient.get<ArticleItemData>(`cms/admin/articles/${encodeURIComponent(id)}`);
  },

  async createArticle(payload: Partial<ArticleItemData>): Promise<{ success: boolean; id: string; slug: string; message: string }> {
    return apiClient.post("cms/admin/articles", payload);
  },

  async updateArticle(id: string, payload: Partial<ArticleItemData>): Promise<{ success: boolean; id: string; message: string }> {
    return apiClient.put(`cms/admin/articles/${encodeURIComponent(id)}`, payload);
  },

  async deleteArticle(id: string): Promise<{ success: boolean; id: string; message: string }> {
    return apiClient.delete(`cms/admin/articles/${encodeURIComponent(id)}`);
  },

  // Tour Web Publishing Controls
  async toggleTourWebPublish(tourId: string, payload: WebPublishPayload): Promise<{ success: boolean; tour_id: string; message: string }> {
    return apiClient.patch(`tours/${encodeURIComponent(tourId)}/publish-web`, payload);
  },

  // Direct Multipart Media Upload to cPanel
  async uploadMedia(file: File): Promise<{ success: boolean; url: string; filename: string; mime: string; size: number }> {
    const formData = new FormData();
    formData.append("file", file);
    return apiClient.post("cms/upload", formData);
  },
};

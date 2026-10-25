"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAgencySettings } from "@/context/ThemeContext";
import { getTourPackages } from "@/lib/tours-api";
import {
  cmsApi,
  HeroConfigData,
  GalleryItemData,
  ArticleItemData,
  WebPublishPayload,
} from "@/lib/cms-api";
import {
  Globe,
  Compass,
  Sparkles,
  Image as ImageIcon,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Edit2,
  Upload,
  ExternalLink,
  Eye,
  EyeOff,
  Star,
  Search,
  RefreshCw,
} from "lucide-react";

export default function WebsiteCmsPage() {
  const { settings, formatMoney } = useAgencySettings();
  const [activeTab, setActiveTab] = useState<"packages" | "hero" | "gallery" | "articles">("packages");
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Data states
  const [tours, setTours] = useState<any[]>([]);
  const [heroConfig, setHeroConfig] = useState<HeroConfigData>({
    kicker: "",
    headline: "",
    highlight_word: "",
    subheadline: "",
    stats: [],
    showcase_cards: [],
  });
  const [gallery, setGallery] = useState<GalleryItemData[]>([]);
  const [articles, setArticles] = useState<ArticleItemData[]>([]);

  // Search & filter
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [editingTour, setEditingTour] = useState<any | null>(null);
  const [tourPublishPayload, setTourPublishPayload] = useState<WebPublishPayload>({});
  const [showGalleryModal, setShowGalleryModal] = useState(false);
  const [editingGalleryItem, setEditingGalleryItem] = useState<Partial<GalleryItemData> | null>(null);
  const [showArticleModal, setShowArticleModal] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Partial<ArticleItemData> | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const showToast = (type: "success" | "error", msg: string) => {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 5000);
  };

  // Load all CMS data
  const loadCmsData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [toursRes, heroRes, galRes, artRes] = await Promise.allSettled([
        getTourPackages(),
        cmsApi.getHero(),
        cmsApi.listGallery(),
        cmsApi.listArticles(),
      ]);

      if (toursRes.status === "fulfilled" && Array.isArray(toursRes.value)) {
        setTours(toursRes.value);
      }
      if (heroRes.status === "fulfilled" && heroRes.value) {
        setHeroConfig(heroRes.value);
      }
      if (galRes.status === "fulfilled" && Array.isArray(galRes.value)) {
        setGallery(galRes.value);
      }
      if (artRes.status === "fulfilled" && Array.isArray(artRes.value)) {
        setArticles(artRes.value);
      }
    } catch {
      showToast("error", "Failed to fetch CMS datasets from cPanel backend.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCmsData();
  }, [loadCmsData]);

  // Handle Tour Publishing Toggle
  const handleTogglePublish = async (tour: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = !Boolean(tour.is_published_web);
    try {
      await cmsApi.toggleTourWebPublish(tour.id, { is_published_web: newStatus });
      setTours((prev) =>
        prev.map((t) => (t.id === tour.id ? { ...t, is_published_web: newStatus } : t))
      );
      showToast(
        "success",
        newStatus ? `"${tour.title}" is now published on the agency website.` : `"${tour.title}" unpublished.`
      );
    } catch (err: any) {
      showToast("error", err?.message || "Failed to update tour publication state.");
    }
  };

  const handleToggleFeatured = async (tour: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const newFeatured = !Boolean(tour.is_featured_web);
    try {
      await cmsApi.toggleTourWebPublish(tour.id, { is_featured_web: newFeatured });
      setTours((prev) =>
        prev.map((t) => (t.id === tour.id ? { ...t, is_featured_web: newFeatured } : t))
      );
      showToast(
        "success",
        newFeatured ? `"${tour.title}" featured on the homepage.` : `Removed from featured carousel.`
      );
    } catch (err: any) {
      showToast("error", err?.message || "Failed to update featured state.");
    }
  };

  const handleSaveTourPublishSettings = async () => {
    if (!editingTour) return;
    try {
      await cmsApi.toggleTourWebPublish(editingTour.id, tourPublishPayload);
      setTours((prev) =>
        prev.map((t) => (t.id === editingTour.id ? { ...t, ...tourPublishPayload } : t))
      );
      showToast("success", "Tour marketing settings updated successfully.");
      setEditingTour(null);
    } catch (err: any) {
      showToast("error", err?.message || "Failed to save tour settings.");
    }
  };

  // Handle Hero Save
  const handleSaveHero = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await cmsApi.updateHero(heroConfig);
      setHeroConfig(res);
      showToast("success", "Homepage Hero configuration and Trust KPIs updated.");
    } catch (err: any) {
      showToast("error", err?.message || "Failed to update Hero configuration.");
    }
  };

  // Handle Gallery Save
  const handleSaveGalleryItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGalleryItem?.title || !editingGalleryItem?.image_url) {
      showToast("error", "Title and Image URL are required.");
      return;
    }

    try {
      if (editingGalleryItem.id) {
        await cmsApi.updateGalleryItem(editingGalleryItem.id, editingGalleryItem);
        setGallery((prev) =>
          prev.map((item) => (item.id === editingGalleryItem.id ? { ...item, ...editingGalleryItem } : item))
        );
        showToast("success", "Gallery item updated.");
      } else {
        const res = await cmsApi.createGalleryItem(editingGalleryItem);
        setGallery((prev) => [
          {
            id: res.id,
            title: editingGalleryItem.title!,
            destination: editingGalleryItem.destination || "International",
            image_url: editingGalleryItem.image_url!,
            tour_date: editingGalleryItem.tour_date,
            caption: editingGalleryItem.caption,
            display_order: editingGalleryItem.display_order || 0,
            is_active: true,
          },
          ...prev,
        ]);
        showToast("success", "New photo added to delegation gallery.");
      }
      setShowGalleryModal(false);
      setEditingGalleryItem(null);
    } catch (err: any) {
      showToast("error", err?.message || "Failed to save gallery item.");
    }
  };

  const handleDeleteGallery = async (id: string) => {
    if (!confirm("Are you sure you want to remove this photo from the gallery?")) return;
    try {
      await cmsApi.deleteGalleryItem(id);
      setGallery((prev) => prev.filter((g) => g.id !== id));
      showToast("success", "Photo deleted from gallery.");
    } catch (err: any) {
      showToast("error", err?.message || "Failed to delete photo.");
    }
  };

  // Handle Article Save
  const handleSaveArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingArticle?.title || !editingArticle?.content) {
      showToast("error", "Article Title and Content are required.");
      return;
    }

    try {
      if (editingArticle.id) {
        await cmsApi.updateArticle(editingArticle.id, editingArticle);
        setArticles((prev) =>
          prev.map((a) => (a.id === editingArticle.id ? { ...a, ...editingArticle } : a))
        );
        showToast("success", "Article updated.");
      } else {
        const res = await cmsApi.createArticle(editingArticle);
        setArticles((prev) => [
          {
            id: res.id,
            slug: res.slug,
            title: editingArticle.title!,
            category: editingArticle.category || "Visa Advisory",
            author_desk: editingArticle.author_desk || "Executive Visa Desk",
            summary: editingArticle.summary || editingArticle.content!.slice(0, 150),
            banner_image_url: editingArticle.banner_image_url,
            read_time: editingArticle.read_time || "4 min read",
            is_published: editingArticle.is_published ?? true,
          },
          ...prev,
        ]);
        showToast("success", "Travel article created successfully.");
      }
      setShowArticleModal(false);
      setEditingArticle(null);
    } catch (err: any) {
      showToast("error", err?.message || "Failed to save article.");
    }
  };

  const handleDeleteArticle = async (id: string) => {
    if (!confirm("Are you sure you want to delete this article?")) return;
    try {
      await cmsApi.deleteArticle(id);
      setArticles((prev) => prev.filter((a) => a.id !== id));
      showToast("success", "Article deleted.");
    } catch (err: any) {
      showToast("error", err?.message || "Failed to delete article.");
    }
  };

  // Image File Upload Helper
  const handleFileUpload = async (file: File, onUploaded: (url: string) => void) => {
    setIsUploading(true);
    try {
      const res = await cmsApi.uploadMedia(file);
      onUploaded(res.url);
      showToast("success", "Media uploaded to server storage.");
    } catch (err: any) {
      showToast("error", err?.message || "Failed to upload image to cPanel.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Banner */}
      <div className="bg-white dark:bg-[#092C53] rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-[#0081C6]/10 text-[#0081C6] dark:bg-[#70C044]/15 dark:text-[#70C044]">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Agency Website CMS
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Curate the public catalog, homepage hero, delegation gallery, and visa advisories for{" "}
                <span className="font-semibold text-[#0081C6] dark:text-[#70C044]">worldclassholidays.org</span>
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadCmsData}
            disabled={isLoading}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Sync With Database
          </button>
          <a
            href="https://worldclassholidays.org"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-[#0081C6] hover:bg-[#0E548A] text-white shadow-sm transition"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            View Live Site
          </a>
        </div>
      </div>

      {/* Toast Feedback */}
      {feedback && (
        <div
          className={`flex items-center gap-3 p-4 rounded-xl text-xs font-semibold ${
            feedback.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800"
              : "bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          )}
          <span>{feedback.msg}</span>
        </div>
      )}

      {/* Master Tab Bar */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2">
        <button
          onClick={() => setActiveTab("packages")}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition ${
            activeTab === "packages"
              ? "border-[#0081C6] text-[#0081C6] dark:border-[#70C044] dark:text-[#70C044]"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Compass className="w-4 h-4" />
          Tour Packages Web Catalog ({tours.length})
        </button>

        <button
          onClick={() => setActiveTab("hero")}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition ${
            activeTab === "hero"
              ? "border-[#0081C6] text-[#0081C6] dark:border-[#70C044] dark:text-[#70C044]"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          Hero & Trust Counters
        </button>

        <button
          onClick={() => setActiveTab("gallery")}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition ${
            activeTab === "gallery"
              ? "border-[#0081C6] text-[#0081C6] dark:border-[#70C044] dark:text-[#70C044]"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          Delegation Photo Moments ({gallery.length})
        </button>

        <button
          onClick={() => setActiveTab("articles")}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition ${
            activeTab === "articles"
              ? "border-[#0081C6] text-[#0081C6] dark:border-[#70C044] dark:text-[#70C044]"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Travel Insights & Advisories ({articles.length})
        </button>
      </div>

      {/* =========================================================================
          TAB 1: TOUR PACKAGES WEB CATALOG
      ========================================================================= */}
      {activeTab === "packages" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search departures..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0081C6]"
              />
            </div>
            <p className="text-xs text-slate-500">
              Only departures toggled as <strong>Published</strong> appear on the public website catalog.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Tour Package</th>
                  <th className="py-3 px-4">Destination</th>
                  <th className="py-3 px-4">Departure Date</th>
                  <th className="py-3 px-4">Retail Price</th>
                  <th className="py-3 px-4">Website Status</th>
                  <th className="py-3 px-4">Featured</th>
                  <th className="py-3 px-4 text-right">Marketing Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {tours
                  .filter((t) =>
                    searchQuery === ""
                      ? true
                      : t.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        t.destination?.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((tour) => (
                    <tr key={tour.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">{tour.title}</div>
                        <div className="text-[11px] text-slate-500">{tour.durationDays} Days • {tour.bookedSeats || 0}/{tour.maxCapacity} Booked</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                          {tour.destination || "International"}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px]">
                        {tour.departureDate || tour.departure_date || "TBD"}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                        {formatMoney(tour.pricePerPerson || tour.price_per_person || 0)}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={(e) => handleTogglePublish(tour, e)}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition ${
                            tour.is_published_web
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400"
                              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                          }`}
                        >
                          {tour.is_published_web ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                          {tour.is_published_web ? "Published" : "Hidden"}
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={(e) => handleToggleFeatured(tour, e)}
                          className={`p-1.5 rounded-lg transition ${
                            tour.is_featured_web
                              ? "text-amber-500 bg-amber-50 dark:bg-amber-950/30"
                              : "text-slate-300 hover:text-slate-400"
                          }`}
                          title={tour.is_featured_web ? "Featured on Homepage" : "Click to feature"}
                        >
                          <Star className={`w-4 h-4 ${tour.is_featured_web ? "fill-amber-500" : ""}`} />
                        </button>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => {
                            setEditingTour(tour);
                            setTourPublishPayload({
                              is_published_web: Boolean(tour.is_published_web),
                              is_featured_web: Boolean(tour.is_featured_web),
                              web_badge: tour.web_badge || "Guaranteed Departure",
                              web_hero_image: tour.web_hero_image || "",
                              web_overview: tour.web_overview || "",
                              web_departure_hubs: tour.web_departure_hubs || ["LHE", "ISB", "KHI", "SKT"],
                            });
                          }}
                          className="px-3 py-1 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition"
                        >
                          Configure Web Card
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: HERO & TRUST COUNTERS
      ========================================================================= */}
      {activeTab === "hero" && (
        <form onSubmit={handleSaveHero} className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 space-y-6 shadow-sm">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Homepage Top Hero Banner & Compliance Tag
            </h2>
            <p className="text-xs text-slate-500">
              Customizes the prominent headline, value proposition, and trust counters on the public landing page.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Kicker Badge Text
              </label>
              <input
                type="text"
                value={heroConfig.kicker}
                onChange={(e) => setHeroConfig({ ...heroConfig, kicker: e.target.value })}
                className="w-full p-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                placeholder="Accredited Outbound Tour Operator & Corporate MICE Partner"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Main Headline
              </label>
              <input
                type="text"
                value={heroConfig.headline}
                onChange={(e) => setHeroConfig({ ...heroConfig, headline: e.target.value })}
                className="w-full p-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                placeholder="Curated Group Journeys & Fixed Departures"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Gradient Highlight Word
              </label>
              <input
                type="text"
                value={heroConfig.highlight_word}
                onChange={(e) => setHeroConfig({ ...heroConfig, highlight_word: e.target.value })}
                className="w-full p-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                placeholder="Worldwide"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Sub-Headline Narrative
              </label>
              <textarea
                rows={3}
                value={heroConfig.subheadline}
                onChange={(e) => setHeroConfig({ ...heroConfig, subheadline: e.target.value })}
                className="w-full p-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              />
            </div>
          </div>

          {/* 4 Trust KPI Counters */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3">
              4 Regulatory & Authority Trust Counters
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {(heroConfig.stats || []).map((stat, idx) => (
                <div key={stat.id || idx} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Value</label>
                    <input
                      type="text"
                      value={stat.value}
                      onChange={(e) => {
                        const newStats = [...heroConfig.stats];
                        newStats[idx].value = e.target.value;
                        setHeroConfig({ ...heroConfig, stats: newStats });
                      }}
                      className="w-full p-1.5 text-xs font-bold rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Label</label>
                    <input
                      type="text"
                      value={stat.label}
                      onChange={(e) => {
                        const newStats = [...heroConfig.stats];
                        newStats[idx].label = e.target.value;
                        setHeroConfig({ ...heroConfig, stats: newStats });
                      }}
                      className="w-full p-1.5 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-6 py-2.5 text-xs font-bold rounded-xl bg-[#0081C6] hover:bg-[#0E548A] text-white shadow-sm transition"
            >
              Save Hero Changes
            </button>
          </div>
        </form>
      )}

      {/* =========================================================================
          TAB 3: DELEGATION PHOTO MOMENTS
      ========================================================================= */}
      {activeTab === "gallery" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Verified photos of real tour groups, corporate delegations, and family holidays.
            </p>
            <button
              onClick={() => {
                setEditingGalleryItem({
                  title: "",
                  destination: "Azerbaijan",
                  image_url: "",
                  tour_date: "October 2026",
                  caption: "",
                  display_order: gallery.length + 1,
                  is_active: true,
                });
                setShowGalleryModal(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-[#70C044] hover:bg-[#589F31] text-white shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              Add Photo Moment
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {gallery.map((item) => (
              <div
                key={item.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm flex flex-col group"
              >
                <div className="aspect-video relative bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.image_url}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/60 text-white text-[10px] font-bold backdrop-blur-sm">
                    {item.destination}
                  </div>
                </div>
                <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">{item.title}</h4>
                    <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{item.caption || item.tour_date}</p>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                    <span className="text-slate-400 font-mono">Order: {item.display_order ?? 0}</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingGalleryItem(item);
                          setShowGalleryModal(true);
                        }}
                        className="p-1 rounded text-slate-500 hover:text-slate-700 dark:hover:text-white"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteGallery(item.id)}
                        className="p-1 rounded text-rose-500 hover:text-rose-700"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 4: TRAVEL INSIGHTS & VISA ADVISORIES
      ========================================================================= */}
      {activeTab === "articles" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Editorial advisories, e-visa protocols, and destination guides published by the Executive Visa Desk.
            </p>
            <button
              onClick={() => {
                setEditingArticle({
                  title: "",
                  slug: "",
                  category: "Visa Advisory",
                  author_desk: "Executive Visa Desk",
                  summary: "",
                  content: "",
                  banner_image_url: "",
                  read_time: "4 min read",
                  is_published: true,
                });
                setShowArticleModal(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-[#70C044] hover:bg-[#589F31] text-white shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              Compose Advisory Article
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {articles.map((article) => (
              <div
                key={article.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#0081C6]/10 text-[#0081C6] dark:bg-[#70C044]/15 dark:text-[#70C044]">
                      {article.category}
                    </span>
                    <span className="text-[11px] text-slate-400">{article.read_time}</span>
                  </div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white mt-2 leading-snug">
                    {article.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                    {article.summary}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                  <span className="text-slate-400 font-semibold">{article.author_desk}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditingArticle(article);
                        setShowArticleModal(true);
                      }}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteArticle(article.id)}
                      className="p-1 rounded text-rose-500 hover:text-rose-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: TOUR MARKETING & WEB PUBLISH SETTINGS
      ========================================================================= */}
      {editingTour && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-xl">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
              Website Marketing Settings: {editingTour.title}
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tourPublishPayload.is_published_web}
                    onChange={(e) =>
                      setTourPublishPayload({ ...tourPublishPayload, is_published_web: e.target.checked })
                    }
                    className="w-4 h-4 rounded text-[#0081C6]"
                  />
                  Publish on Website
                </label>
                <label className="flex items-center gap-2 font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tourPublishPayload.is_featured_web}
                    onChange={(e) =>
                      setTourPublishPayload({ ...tourPublishPayload, is_featured_web: e.target.checked })
                    }
                    className="w-4 h-4 rounded text-amber-500"
                  />
                  Feature on Homepage Carousel
                </label>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Marketing Badge (e.g. Guaranteed Departure, Early Bird, Best Seller)
                </label>
                <input
                  type="text"
                  value={tourPublishPayload.web_badge || ""}
                  onChange={(e) =>
                    setTourPublishPayload({ ...tourPublishPayload, web_badge: e.target.value })
                  }
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Cover / Hero Image (cPanel upload or external web URL)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tourPublishPayload.web_hero_image || ""}
                    onChange={(e) =>
                      setTourPublishPayload({ ...tourPublishPayload, web_hero_image: e.target.value })
                    }
                    className="flex-1 p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                    placeholder="https://images.unsplash.com/... or /uploads/cms/..."
                  />
                  <label className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl cursor-pointer flex items-center gap-1 font-semibold">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleFileUpload(file, (url) =>
                            setTourPublishPayload({ ...tourPublishPayload, web_hero_image: url })
                          );
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setEditingTour(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveTourPublishSettings}
                className="px-4 py-2 rounded-xl bg-[#0081C6] hover:bg-[#0E548A] text-white font-bold"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: ADD / EDIT GALLERY ITEM
      ========================================================================= */}
      {showGalleryModal && editingGalleryItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveGalleryItem}
            className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-xl text-xs"
          >
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
              {editingGalleryItem.id ? "Edit Photo Moment" : "Add Delegation Photo Moment"}
            </h3>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Moment Title / Caption
              </label>
              <input
                required
                type="text"
                value={editingGalleryItem.title || ""}
                onChange={(e) => setEditingGalleryItem({ ...editingGalleryItem, title: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                placeholder="e.g. Executive Delegation at Baku Boulevard"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Destination</label>
                <input
                  required
                  type="text"
                  value={editingGalleryItem.destination || ""}
                  onChange={(e) => setEditingGalleryItem({ ...editingGalleryItem, destination: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  placeholder="Azerbaijan"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Tour Date / Stamp</label>
                <input
                  type="text"
                  value={editingGalleryItem.tour_date || ""}
                  onChange={(e) => setEditingGalleryItem({ ...editingGalleryItem, tour_date: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  placeholder="October 2026"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Photo URL (Local cPanel or External Web URL)
              </label>
              <div className="flex gap-2">
                <input
                  required
                  type="text"
                  value={editingGalleryItem.image_url || ""}
                  onChange={(e) => setEditingGalleryItem({ ...editingGalleryItem, image_url: e.target.value })}
                  className="flex-1 p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  placeholder="https://..."
                />
                <label className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl cursor-pointer flex items-center gap-1 font-semibold">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleFileUpload(file, (url) =>
                          setEditingGalleryItem({ ...editingGalleryItem, image_url: url })
                        );
                      }
                    }}
                  />
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setShowGalleryModal(false);
                  setEditingGalleryItem(null);
                }}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isUploading}
                className="px-4 py-2 rounded-xl bg-[#70C044] hover:bg-[#589F31] text-white font-bold"
              >
                Save Moment
              </button>
            </div>
          </form>
        </div>
      )}

      {/* =========================================================================
          MODAL: ADD / EDIT ARTICLE
      ========================================================================= */}
      {showArticleModal && editingArticle && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveArticle}
            className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full border border-slate-200 dark:border-slate-800 p-6 space-y-3.5 shadow-xl text-xs max-h-[90vh] overflow-y-auto"
          >
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
              {editingArticle.id ? "Edit Travel Advisory Article" : "Compose Travel Advisory Article"}
            </h3>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Article Title</label>
              <input
                required
                type="text"
                value={editingArticle.title || ""}
                onChange={(e) => setEditingArticle({ ...editingArticle, title: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                placeholder="Azerbaijan ASAN Visa Requirements for Pakistani Citizens"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Category</label>
                <select
                  value={editingArticle.category || "Visa Advisory"}
                  onChange={(e) => setEditingArticle({ ...editingArticle, category: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                >
                  <option value="Visa Advisory">Visa Advisory</option>
                  <option value="Destination Guide">Destination Guide</option>
                  <option value="Corporate MICE">Corporate MICE</option>
                  <option value="Travel Tips">Travel Tips</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Author Desk</label>
                <input
                  type="text"
                  value={editingArticle.author_desk || "Executive Visa Desk"}
                  onChange={(e) => setEditingArticle({ ...editingArticle, author_desk: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Summary Snippet</label>
              <textarea
                rows={2}
                value={editingArticle.summary || ""}
                onChange={(e) => setEditingArticle({ ...editingArticle, summary: e.target.value })}
                className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                placeholder="A concise 1-2 sentence overview shown on catalog preview cards..."
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Full Article Content (Markdown supported)
              </label>
              <textarea
                required
                rows={6}
                value={editingArticle.content || ""}
                onChange={(e) => setEditingArticle({ ...editingArticle, content: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-xs"
                placeholder="Detailed guidance, required documents, fee structures, and embassy instructions..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setShowArticleModal(false);
                  setEditingArticle(null);
                }}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[#0081C6] hover:bg-[#0E548A] text-white font-bold"
              >
                Publish Article
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

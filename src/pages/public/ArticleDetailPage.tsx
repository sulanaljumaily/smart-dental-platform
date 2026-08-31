import React, { useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, Share2, Calendar, Copy, Twitter, Facebook, Linkedin, BookOpen, Quote } from 'lucide-react';
import { useArticle, useArticles } from '../../hooks/useArticles';
import { usePublicClinics } from '../../hooks/usePublicClinics';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { ClinicCard } from '../../components/cards/ClinicCard';
import { ArticleCard } from '../../components/cards/ArticleCard';
import { formatNumericDate } from '../../lib/date';

export const ArticleDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { article, loading, error } = useArticle(id || '');
  const { articles } = useArticles();
  const { clinics } = usePublicClinics();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  if (loading) return null; // Use a skeleton screen in real app
  if (error || !article) return null; // Or 404 page

  const relatedArticles = articles
    .filter(a => a.category === article.category && a.id !== article.id)
    .slice(0, 3);

  const featuredClinics = clinics.filter(c => c.settings?.articleSuggestions === true).slice(0, 3);

  return (
    <>
      <Helmet>
        <title>{article.title} | Dental Platform</title>
        <meta name="description" content={article.excerpt} />
        <meta name="keywords" content={`طب الأسنان, ${article.category}, مقالات طبية, Dental Platform, العناية بالأسنان`} />
        <link rel="canonical" href={`https://dental-platform.com/article/${article.id}`} />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="article" />
        <meta property="og:title" content={article.title} />
        <meta property="og:description" content={article.excerpt} />
        <meta property="og:url" content={`https://dental-platform.com/article/${article.id}`} />
        {article.image && <meta property="og:image" content={article.image} />}
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={article.title} />
        <meta name="twitter:description" content={article.excerpt} />
        {article.image && <meta name="twitter:image" content={article.image} />}

        {/* Structured Data (JSON-LD) for Article */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "MedicalWebPage",
            "headline": article.title,
            "description": article.excerpt,
            "image": article.image || "https://dental-platform.com/icons/icon-512x512.png",
            "datePublished": article.date || "2026-01-01",
            "author": {
              "@type": "Organization",
              "name": article.author || "DENTAL PLATFORM"
            },
            "publisher": {
              "@type": "Organization",
              "name": "DENTAL PLATFORM",
              "logo": {
                "@type": "ImageObject",
                "url": "https://dental-platform.com/icons/icon-512x512.png"
              }
            },
            "mainEntityOfPage": {
              "@type": "WebPage",
              "@id": `https://dental-platform.com/article/${article.id}`
            }
          })}
        </script>
      </Helmet>
      
      <div className="min-h-screen bg-white pb-32">
        {/* Progress Bar (Optional) */}
        <div className="fixed top-0 left-0 h-1 bg-blue-600 z-50 w-full origin-left transform scale-x-0" id="progress-bar" />

      {/* Navigation & Actions Header */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100 transition-all">
        <div className="container mx-auto px-4 h-12 flex items-center justify-between max-w-4xl">
          <button
            onClick={() => navigate('/services#tab-articles')}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 hover:text-blue-600 transition-colors">
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-3xl pt-3 md:pt-4">

        {/* Article Meta Header */}
        <div className="text-center mb-5">
          <div className="inline-flex items-center justify-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold border border-blue-100/80">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              {article.category}
            </span>
            <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              <span>{formatNumericDate(article.date || new Date().toISOString())}</span>
            </div>
          </div>

          <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-gray-900 leading-snug max-w-2xl mx-auto">
            {article.title}
          </h1>
        </div>

        {/* Featured Image (if exists) */}
        {article.image && (
          <div className="mb-6 rounded-2xl md:rounded-3xl overflow-hidden shadow-xl shadow-gray-200">
            <img src={article.image} alt={article.title} className="w-full h-auto object-cover max-h-[420px]" />
          </div>
        )}

        {/* Excerpt */}
        <div className="relative mb-6 bg-blue-50/30 p-4 md:p-5 rounded-2xl border border-blue-100/60">
          <p className="text-base md:text-lg font-bold text-gray-800 leading-relaxed">
            {article.excerpt}
          </p>
        </div>

        {/* Main Content */}
        <div className="prose prose-lg prose-blue max-w-none text-gray-600 leading-loose prose-headings:font-bold prose-headings:text-gray-900 mb-8">
          {article.content.split('\n\n').map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>

        {/* Author / Source Box */}
        <div className="bg-blue-50/50 rounded-2xl p-4 md:p-5 mb-10 flex items-center gap-4 border border-blue-100">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-0.5">المصدر العلمي</h3>
            <p className="text-gray-600 leading-normal text-xs md:text-sm">
              تمت مراجعة المحتوى وتدقيقه طبياً من قِبل أطباء أسنان مختصين لضمان صحة ودقة المعلومات.
            </p>
          </div>
        </div>

        {/* Suggested Clinics (Simple List) */}
        {featuredClinics.length > 0 && (
          <div className="mb-20">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-bold text-gray-900">عيادات مقترحة</h3>
              <Link to="/services" className="text-sm font-medium text-blue-600 hover:text-blue-700">عرض الكل</Link>
            </div>
            {/* Horizontal Scroll Layout for Suggested Clinics */}
            <div className="flex gap-6 overflow-x-auto scrollbar-hide scroll-smooth pb-4 px-2 -mx-4 px-4" style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
              <style>{`
                .scrollbar-hide::-webkit-scrollbar {
                  display: none;
                }
              `}</style>
              {featuredClinics.map(clinic => (
                <div key={clinic.id}>
                  <ClinicCard clinic={clinic} expandable={true} />
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Related Articles Footer */}
      {relatedArticles.length > 0 && (
        <div className="bg-gray-50 py-20 border-t border-gray-200">
          <div className="container mx-auto px-4">
            <h3 className="text-2xl font-bold text-center text-gray-900 mb-12">مقالات ذات صلة</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {relatedArticles.map(a => (
                <div key={a.id} className="h-[400px]">
                  <ArticleCard article={a} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
};

'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getBlogPost } from '@/lib/firestore';
import type { BlogPost } from '@/lib/types';
import BlogEditor from '@/components/dashboard/BlogEditor';

export default function EditBlogPostPage() {
  const { id } = useParams<{ id: string }>();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getBlogPost(id)
      .then((p) => {
        if (!p) setError('Artikel nicht gefunden.');
        setPost(p);
      })
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="card text-sm text-gray-500">Lädt…</div>;
  }
  if (error || !post) {
    return (
      <div className="card text-sm text-red-700 bg-red-50 border-red-200">
        {error ?? 'Artikel nicht gefunden.'}
      </div>
    );
  }
  return <BlogEditor post={post} />;
}

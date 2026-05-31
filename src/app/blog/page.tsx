import { Suspense } from 'react';
import BlogListClient from '@/components/BlogListClient';
import { getAllPosts } from '@/lib/posts';

export default function BlogListPage() {
  const posts = getAllPosts();

  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white text-[#333D4B] antialiased flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3182F6] mx-auto"></div>
          <p className="text-sm text-[#8B95A1] font-semibold">소식을 불러오는 중입니다...</p>
        </div>
      </div>
    }>
      <BlogListClient initialPosts={posts} />
    </Suspense>
  );
}

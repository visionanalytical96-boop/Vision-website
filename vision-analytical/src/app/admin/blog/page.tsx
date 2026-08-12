import type { Metadata } from 'next';
import Link from 'next/link';
import { Plus, Pencil } from 'lucide-react';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@/components/ui/Table';
import { EmptyState } from '@/components/ui/EmptyState';
import { buttonVariants } from '@/components/ui/Button';
import { ConfirmSubmitButton } from '@/components/forms/ConfirmSubmitButton';
import { getAdminBlogPosts } from '@/lib/data/admin-blog';
import { deleteBlogPost, setBlogPostStatus } from '@/lib/actions/admin-blog';
import { Select } from '@/components/ui/Select';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { CONTENT_STATUSES, CONTENT_STATUS_LABELS, contentStatusMeta, isScheduled } from '@/lib/content-status';
import { BLOG_CATEGORY_LABELS } from '@/lib/blog-categories';
import { formatDate, formatDateTime } from '@/lib/format';

export const metadata: Metadata = { title: 'Blog' };

export default async function AdminBlogPage() {
  const posts = await getAdminBlogPosts();

  if (posts.length === 0) {
    return (
      <EmptyState
        title="No blog posts yet"
        description="Publish troubleshooting guides, FAQs and technical articles to the Knowledge Base."
        actionLabel="New Post"
        actionHref="/admin/blog/new"
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Link href="/admin/blog/new" className={buttonVariants({ variant: 'primary', size: 'sm' })}>
          <Plus className="h-4 w-4" />
          New Post
        </Link>
      </div>

      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Title</TableHeaderCell>
            <TableHeaderCell>Category</TableHeaderCell>
            <TableHeaderCell>Author</TableHeaderCell>
            <TableHeaderCell>Created</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            <TableHeaderCell>Move to</TableHeaderCell>
            <TableHeaderCell />
          </TableRow>
        </TableHead>
        <TableBody>
          {posts.map((post) => (
            <TableRow key={post.id}>
              <TableCell>{post.title}</TableCell>
              <TableCell>{BLOG_CATEGORY_LABELS[post.category]}</TableCell>
              <TableCell>{post.author.name}</TableCell>
              <TableCell>{formatDate(post.createdAt)}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <StatusBadge meta={contentStatusMeta[post.status]} />
                  {isScheduled(post.status, post.publishAt) && (
                    <span className="text-xs text-warning">scheduled {formatDateTime(post.publishAt!)}</span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <form action={setBlogPostStatus} className="flex items-center gap-1">
                  <input type="hidden" name="id" value={post.id} />
                  <label className="sr-only" htmlFor={`status-${post.id}`}>
                    Change status for {post.title}
                  </label>
                  <Select
                    id={`status-${post.id}`}
                    name="status"
                    defaultValue={post.status}
                    className="h-8 w-36 text-xs"
                  >
                    {CONTENT_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {CONTENT_STATUS_LABELS[status]}
                      </option>
                    ))}
                  </Select>
                  <button type="submit" className="text-xs text-primary hover:underline dark:text-secondary">
                    Set
                  </button>
                </form>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Link href={`/admin/blog/${post.id}`} className="text-primary hover:underline dark:text-secondary" aria-label={`Edit ${post.title}`}>
                    <Pencil className="h-4 w-4" />
                  </Link>
                  <form action={deleteBlogPost}>
                    <input type="hidden" name="id" value={post.id} />
                    <ConfirmSubmitButton
                      confirmMessage={`Delete "${post.title}"? This cannot be undone.`}
                      className="text-xs text-danger hover:underline"
                    >
                      Delete
                    </ConfirmSubmitButton>
                  </form>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

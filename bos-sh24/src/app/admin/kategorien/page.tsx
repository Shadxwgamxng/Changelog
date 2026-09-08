import { getCategories } from "@/lib/queries";
import { CategoryManager } from "@/components/admin/CategoryManager";

export const metadata = { title: "Kategorien verwalten" };

export default async function AdminCategoriesPage() {
  const categories = await getCategories();

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-extrabold text-ink-900 dark:text-white">Kategorien</h1>
      <CategoryManager categories={categories} />
    </div>
  );
}

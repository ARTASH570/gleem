"use client";

import { useState, useTransition } from "react";
import { deleteExpense, updateExpense } from "./actions";

type Expense = { id: string; title: string; amount: number; expense_date: string };

export default function ExpenseRow({ expense }: { expense: Expense }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(expense.title);
  const [amount, setAmount] = useState(String(expense.amount));
  const [date, setDate] = useState(expense.expense_date.slice(0, 10));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    setError(null);
    const formData = new FormData();
    formData.set("title", title);
    formData.set("amount", amount);
    formData.set("expense_date", date);
    startTransition(async () => {
      const result = await updateExpense(expense.id, formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setEditing(false);
    });
  }

  function handleDelete() {
    if (!confirm(`متأكد إنك عاوز تمسح مصروف "${expense.title}"؟`)) return;
    startTransition(() => {
      deleteExpense(expense.id);
    });
  }

  if (editing) {
    return (
      <tr>
        <td colSpan={4} className="bg-gray-50 p-2">
          {error && <p className="text-red-600 text-xs mb-1">{error}</p>}
          <div className="flex flex-wrap gap-2 items-end">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input-field py-1 text-sm"
              placeholder="البيان"
            />
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="input-field py-1 text-sm w-28"
            />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="input-field py-1 text-sm"
            />
            <button
              onClick={handleSave}
              disabled={isPending}
              className="btn-primary text-xs py-1 disabled:opacity-50"
            >
              حفظ
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setError(null);
              }}
              className="btn-secondary text-xs py-1"
            >
              إلغاء
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td data-label="البيان">{expense.title}</td>
      <td data-label="المبلغ">{Number(expense.amount).toLocaleString()} ج.م</td>
      <td data-label="التاريخ">{new Date(expense.expense_date).toLocaleDateString("ar-EG")}</td>
      <td className="whitespace-nowrap">
        <button onClick={() => setEditing(true)} className="text-brand-600 hover:underline text-xs ml-3">
          تعديل
        </button>
        <button onClick={handleDelete} className="text-red-500 hover:underline text-xs">
          مسح
        </button>
      </td>
    </tr>
  );
}

import { redirect } from "next/navigation";

// الطابور بقى جزء من الهوم اسكرين مباشرة (شوف QueueBoard.tsx)، فمابقاش
// له صفحة لوحده. الصفحة دي سايبينها بس عشان أي رابط أو bookmark قديم
// لـ /queue يوديك على الرئيسية بدل ما يديك صفحة مش موجودة.
export default function QueuePageRedirect() {
  redirect("/");
}

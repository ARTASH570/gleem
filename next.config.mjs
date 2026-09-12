/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // بيزوّد مدة كاش الصفحات في المتصفح (Client Router Cache) من الافتراضي
    // (30 ثانية) لمدة أطول بكتير. آمن 100% لأن أي تعديل فعلي (إضافة مريض，
    // فاتورة، تغيير حالة طابور...) بيستخدم revalidatePath اللي بيمسح الكاش
    // فورًا لأي حد فاتح نفس الصفحة، بغض النظر عن الرقم ده.
    staleTimes: {
      dynamic: 300,
    },
  },
};

export default nextConfig;
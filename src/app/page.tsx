export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">
          AI Maturity Assessment Platform
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Đánh giá mức độ trưởng thành AI cho doanh nghiệp
        </p>
        <div className="flex gap-4 justify-center">
          <a
            href="/assessment/start"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Bắt đầu đánh giá
          </a>
          <a
            href="/auth/login"
            className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
          >
            Đăng nhập
          </a>
        </div>
        <div className="mt-12 text-sm text-gray-500">
          <p>5 Miền đánh giá • 37 Câu hỏi • Thang điểm 1-5</p>
        </div>
      </div>
    </main>
  );
}

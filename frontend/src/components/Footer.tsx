export default function Footer() {
  return (
    <footer className="border-t border-gray-200">
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8 py-4 text-xs text-gray-500">
        <span>Revline © {new Date().getFullYear()}</span>
        <span className="mx-2">•</span>
        <span>Built with FastAPI, React, and Tailwind</span>
      </div>
    </footer>
  );
}

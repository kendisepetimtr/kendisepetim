export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-6 text-sm text-slate-600 sm:px-6 lg:px-8 sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} KendiSepetim. Tum haklari saklidir.</p>
        <p>Kurumsal cozumler, guvenilir hizmet.</p>
      </div>
    </footer>
  );
}

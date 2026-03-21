export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="bg-white text-[#303030] overflow-x-hidden">{children}</div>;
}

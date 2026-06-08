import DoctorSidebar from "@/components/doctor/DoctorSidebar";
import Header from "@/components/common/Header";

export default function DoctorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex">
      <DoctorSidebar />

      <div className="flex-1 lg:ml-72 bg-gray-100 min-h-screen">
        <Header />

        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}

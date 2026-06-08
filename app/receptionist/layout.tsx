// import ReceptionistSidebar from "@/components/receptionist/ReceptionistSidebar";
import Header from "@/components/common/Header";

export default function ReceptionistLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex">
      {/* <ReceptionistSidebar /> */}

      <div className="flex-1 bg-gray-100 min-h-screen">
        <Header />

        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}

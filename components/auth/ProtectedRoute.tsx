"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {

  const router = useRouter();

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {

    const token =
      localStorage.getItem("token");

    if (!token) {

      router.push("/login");

    } else {

      setLoading(false);

    }

  }, [router]);

  if (loading) {
    return null;
  }

  return <>{children}</>;
}
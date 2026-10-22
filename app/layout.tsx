import type { Metadata } from "next";
import "./globals.css";
import { TenantProvider } from "@/context/TenantContext";
import { RoleProvider } from "@/context/RoleContext";
import { AuthProvider } from "@/context/AuthContext";
import { DataProvider } from "@/context/DataContext";
import { ThemeProvider, AgencyThemeProvider } from "@/context/ThemeContext";

export const metadata: Metadata = {
  title: "World Class Holidays | CRM & Travel Operations Platform",
  description:
    "Dedicated travel operations and CRM platform for World Class Holidays.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body
        className="font-sans h-full min-h-screen bg-[#EFF1EB] dark:bg-[#09110F] text-[#161A17] dark:text-[#F1F5F2] flex flex-col selection:bg-purple-500/30 selection:text-purple-600 dark:selection:text-purple-200 transition-colors duration-200"
      >
        <ThemeProvider>
          <TenantProvider>
            <RoleProvider>
              <AuthProvider>
                <AgencyThemeProvider>
                  <DataProvider>{children}</DataProvider>
                </AgencyThemeProvider>
              </AuthProvider>
            </RoleProvider>
          </TenantProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

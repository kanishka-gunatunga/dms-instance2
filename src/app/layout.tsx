import type { Metadata } from "next";
import "./globals.css";
import "bootstrap/dist/css/bootstrap.min.css";

import { UserProvider } from "@/context/userContext";
import { PermissionsProvider } from "@/context/userPermissions";
import { CompanyProfileProvider } from "@/context/userCompanyProfile";
import { ChatProvider } from "@/context/ChatContext";

import localFont from "next/font/local";

const roboto = localFont({
  src: [
    {
      path: "./fonts/Roboto-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/Roboto-Bold.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "./fonts/Roboto-LightItalic.woff2",
      weight: "400",
      style: "italic",
    },
  ],
  variable: "--font-roboto",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Document Management System",
  description: "",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${roboto.className} w-100 p-0 m-0`}>
        <UserProvider>
          <ChatProvider>
            <CompanyProfileProvider>
              <PermissionsProvider>
                {children}
              </PermissionsProvider>
            </CompanyProfileProvider>
          </ChatProvider>
        </UserProvider>
      </body>
    </html>
  );
}

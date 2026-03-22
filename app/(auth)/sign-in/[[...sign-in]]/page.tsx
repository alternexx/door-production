"use client";

import { SignIn } from "@clerk/nextjs";
import Image from "next/image";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen">
      <div className="hidden lg:flex lg:w-[60%] items-center justify-center bg-[#111]">
        <div className="text-center flex flex-col items-center gap-2">
          <Image src="/fm-logo.png" alt="FM" width={180} height={80} className="object-contain" />
          <p className="text-[11px] text-gray-600 opacity-50 -mt-1">powered by door</p>
          <p className="mt-3 text-lg text-gray-400">Real estate. Quantified.</p>
        </div>
      </div>
      <div className="flex w-full lg:w-[40%] items-center justify-center bg-white">
        <div className="w-full max-w-sm px-8">
          <div className="lg:hidden mb-8 flex flex-col items-center gap-1">
            <Image src="/fm-logo.png" alt="FM" width={120} height={54} className="object-contain" />
            <p className="text-[10px] text-gray-400 opacity-50">powered by door</p>
            <p className="mt-2 text-sm text-gray-500">Real estate. Quantified.</p>
          </div>
          <SignIn
            appearance={{
              elements: {
                rootBox: "w-full",
                cardBox: "shadow-none w-full",
                card: "shadow-none w-full p-0",
                headerTitle: "text-xl font-semibold text-[#1a1a1a]",
                headerSubtitle: "text-[#6b7280]",
                socialButtonsBlockButton:
                  "border-[#e5e7eb] hover:bg-gray-50 text-[#1a1a1a]",
                formFieldInput:
                  "border-[#e5e7eb] focus:ring-[#b45309] focus:border-[#b45309]",
                footerActionLink: "text-[#b45309] hover:text-[#92400e]",
                formButtonPrimary:
                  "bg-[#b45309] hover:bg-[#92400e] text-white",
                dividerLine: "bg-[#e5e7eb]",
                dividerText: "text-[#6b7280]",
                form: "hidden",
                footer: "hidden",
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}

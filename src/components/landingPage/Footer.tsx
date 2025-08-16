// src/components/landingPage/Footer.tsx

import { Facebook, Instagram, Linkedin, Mail } from "lucide-react";
import Link from "next/link";

export default function Footer() {
  const socialLinks = [
    { name: "Facebook", icon: Facebook, href: "https://www.facebook.com/BillzyHQ/" },
    { name: "Instagram", icon: Instagram, href: "https://instagram.com/techvaseegrah" },
    { name: "LinkedIn", icon: Linkedin, href: "https://linkedin.com/techvaseegrah" },
    { name: "Email", icon: Mail, href: "mailto:techvaseegrah@gmail.com" },
  ];

  const siteLinks = [
    { name: "Home", href: "/" },
    { name: "About", href: "/about" },
    { name: "Contact", href: "/contact" },
    { name: "Pricing", href: "#pricing" },
  ];
  
  const legalLinks = [
    { name: "Privacy Policy", href: "/privacy-policy" },
    { name: "Terms of Service", href: "/terms-conditions" },
  ];

  return (
    <footer className="bg-gray-950 text-gray-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12">
          
          {/* Column 1: Brand & Credit */}
          <div className="lg:col-span-5 flex flex-col">
            <div className="flex-grow">
              <Link href="/" className="inline-block mb-4">
                <img src="/assets/billzzy-logo.png" alt="Billzzy Logo" width={140} height={40} />
              </Link>
              <p className="text-sm text-gray-400 leading-relaxed max-w-xs">
                Simplifying billing for businesses worldwide with smart automation and powerful features.
              </p>
            </div>
            <div className="mt-8">
              <a 
                href="https://techvaseegrah.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-gray-300 hover:text-white transition-colors w-fit"
              >
                Powered by <span className="font-semibold">Tech Vaseegrah</span>
              </a>
              <p className="text-xs text-gray-500 mt-2">
                &copy; {new Date().getFullYear()} Billzzy. All rights reserved.
              </p>
            </div>
          </div>

          {/* Link Columns Wrapper */}
          <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-8">
            {/* Column 2: Site */}
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-300 mb-4">Site</h3>
              <ul className="space-y-3">
                {siteLinks.map((link) => (
                  <li key={link.name}>
                    <Link href={link.href} className="hover:text-white transition-colors">
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            
            {/* Column 3: Legal */}
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-300 mb-4">Legal</h3>
              <ul className="space-y-3">
                {legalLinks.map((link) => (
                  <li key={link.name}>
                    <Link href={link.href} className="hover:text-white transition-colors">
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 4: Follow Us (Icons Only) */}
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-300 mb-4">Follow Us</h3>
              <div className="flex gap-4">
                {socialLinks.map((link) => (
                  <a
                    key={link.name}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-500 hover:text-white hover:scale-110 transition-all"
                    aria-label={link.name}
                  >
                    <link.icon className="w-6 h-6" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
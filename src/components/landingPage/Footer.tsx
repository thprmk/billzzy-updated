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
          <div className="lg:col-span-5">
            <Link href="/" className="flex items-center gap-3 mb-6">
              <img src="/assets/billzzy-logo.png" alt="Billzzy Logo" width={140} height={140} />
            </Link>
            <a 
              href="https://techvaseegrah.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-300 hover:text-white transition-colors w-fit"
            >
              Powered by <span className="font-semibold">Tech Vaseegrah</span>
            </a>
            <p className="text-xs text-gray-500 mt-4 max-w-sm">
              &copy; {new Date().getFullYear()} Billzzy. All rights reserved.
            </p>
          </div>

          {/* Link Columns Wrapper */}
          <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-8">
            {/* Column 2: Socials */}
            <div>
              <h3 className="text-sm font-bold text-white mb-6">Socials</h3>
              <ul className="space-y-4">
                {socialLinks.map((link) => (
                  <li key={link.name}>
                    <a href={link.href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm hover:text-white transition-colors">
                      <link.icon className="w-4 h-4" />
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 3: Site */}
            <div>
              <h3 className="text-sm font-bold text-white mb-6">Site</h3>
              <ul className="space-y-4">
                {siteLinks.map((link) => (
                  <li key={link.name}>
                    <Link href={link.href} className="text-sm hover:text-white transition-colors">
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            
            {/* Column 4: Legal */}
            <div>
              <h3 className="text-sm font-bold text-white mb-6">Legal</h3>
              <ul className="space-y-4">
                {legalLinks.map((link) => (
                  <li key={link.name}>
                    <Link href={link.href} className="text-sm hover:text-white transition-colors">
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Eyebrow from "@/components/Eyebrow";

function AuditWizardForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Form Step 1: Search parameters
  const [website, setWebsite] = useState("");
  const [city, setCity] = useState("");
  const [clinicName, setClinicName] = useState("");
  const [country, setCountry] = useState("US");

  // Preliminary findings returned from Step 1
  const [pendingAuditId, setPendingAuditId] = useState("");
  const [preliminary, setPreliminary] = useState<any>(null);

  // Form Step 2: Contact Details to Unlock
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);

  // Load from query params if coming from Hero Form
  useEffect(() => {
    const queryWebsite = searchParams.get("website");
    const queryCity = searchParams.get("city");
    const queryClinicName = searchParams.get("clinicName");
    
    if (queryWebsite && queryCity) {
      setWebsite(decodeURIComponent(queryWebsite));
      setCity(decodeURIComponent(queryCity));
      if (queryClinicName) {
        setClinicName(decodeURIComponent(queryClinicName));
      }
      
      // Auto-trigger step 1
      const triggerAutoScan = async () => {
        setLoading(true);
        setError("");
        try {
          let formattedUrl = decodeURIComponent(queryWebsite);
          if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
            formattedUrl = `https://${formattedUrl}`;
          }
          
          const res = await fetch("/api/audit/inbound-trigger", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              website: formattedUrl,
              city: decodeURIComponent(queryCity),
              clinicName: queryClinicName ? decodeURIComponent(queryClinicName) : "My Dental Practice",
              country: "US",
            }),
          });
          
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error || "Failed to trigger analysis.");
          }
          
          setPendingAuditId(data.pendingAuditId);
          setPreliminary(data.preliminaryFindings);
          setStep(2);
        } catch (err: any) {
          setError(err.message || "Auto-scan failed. Please try filling the form manually.");
        } finally {
          setLoading(false);
        }
      };
      
      triggerAutoScan();
    }
  }, [searchParams]);

  const handleStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      let formattedUrl = website;
      if (!website.startsWith("http://") && !website.startsWith("https://")) {
        formattedUrl = `https://${website}`;
      }

      const res = await fetch("/api/audit/inbound-trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          website: formattedUrl,
          city,
          clinicName: clinicName || "My Dental Practice",
          country,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to trigger analysis.");
      }

      setPendingAuditId(data.pendingAuditId);
      setPreliminary(data.preliminaryFindings);
      setStep(2);
    } catch (err: any) {
      setError(err.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!consent) {
      setError("Please accept the communication consent to unlock your audit.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/audit/unlock-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pendingAuditId,
          firstName,
          lastName,
          email,
          role,
          phone: phone || undefined,
          consent,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to unlock lead.");
      }

      router.push(data.redirectUrl);
    } catch (err: any) {
      setError(err.message || "Failed to complete the audit setup.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-xl rounded-3xl border border-line bg-white p-8 shadow-[0_20px_50px_-20px_rgba(8,44,58,0.12)]">
      
      {/* STEP 1: Website and City inputs */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="text-center">
            <Eyebrow>Step 1 of 2</Eyebrow>
            <h1 className="mt-4 font-display text-3xl font-medium sm:text-[2.2rem] leading-tight">
              Run My Free Dental Audit
            </h1>
            <p className="mt-2 font-body text-slate text-sm">
              Let's analyze your search visibility, page performance, and competitor ranks.
            </p>
          </div>

          {error && (
            <div className="rounded-xl bg-coral/10 border border-coral/20 p-4 text-center text-sm font-semibold text-coral">
              {error}
            </div>
          )}

          <form onSubmit={handleStep1} className="space-y-4">
            <div>
              <label htmlFor="website" className="block font-body text-xs font-semibold uppercase tracking-wider text-ink-2 mb-2">
                Clinic Website URL
              </label>
              <input
                id="website"
                type="text"
                required
                placeholder="e.g. clinicwebsite.com"
                className="w-full rounded-xl border border-line bg-paper px-4 py-3 font-body text-ink focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="city" className="block font-body text-xs font-semibold uppercase tracking-wider text-ink-2 mb-2">
                  Target City
                </label>
                <input
                  id="city"
                  type="text"
                  required
                  placeholder="e.g. Chicago"
                  className="w-full rounded-xl border border-line bg-paper px-4 py-3 font-body text-ink focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="clinicName" className="block font-body text-xs font-semibold uppercase tracking-wider text-ink-2 mb-2">
                  Clinic Name <span className="text-slate font-normal">(optional)</span>
                </label>
                <input
                  id="clinicName"
                  type="text"
                  placeholder="e.g. Bright Smiles"
                  className="w-full rounded-xl border border-line bg-paper px-4 py-3 font-body text-ink focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
                  value={clinicName}
                  onChange={(e) => setClinicName(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label htmlFor="country" className="block font-body text-xs font-semibold uppercase tracking-wider text-ink-2 mb-2">
                Country
              </label>
              <select
                id="country"
                className="w-full rounded-xl border border-line bg-paper px-4 py-3 font-body text-ink focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              >
                <option value="US">United States</option>
                <option value="CA">Canada</option>
                <option value="UK">United Kingdom</option>
                <option value="AU">Australia</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-teal py-4 font-body text-sm font-bold text-ink shadow-[0_12px_28px_-10px_rgba(14,170,155,0.4)] transition-colors hover:bg-teal-deep hover:text-white disabled:bg-line disabled:text-slate"
            >
              {loading ? "Scanning website details..." : "Run My Free Dental Audit"}
            </button>
          </form>
        </div>
      )}

      {/* STEP 2: Lead Information Gate */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="text-center">
            <Eyebrow>Step 2 of 2</Eyebrow>
            <h1 className="mt-4 font-display text-3xl font-medium sm:text-[2.2rem] leading-tight">
              Unlock Your Scorecard
            </h1>
            <p className="mt-2 font-body text-slate text-sm">
              We found preliminary stats! Please verify your role to access maps ranking & competitor gap.
            </p>
          </div>

          {/* Fast display of preliminary checks */}
          <div className="rounded-2xl bg-mist p-4 border border-line text-xs font-body grid grid-cols-3 gap-2 text-center text-ink-2">
            <div>
              <span className="block font-bold text-teal-deep">SSL Security</span>
              <span className="mt-1 block font-medium">{preliminary?.sslValid ? "Secure (HTTPS)" : "Unsecured"}</span>
            </div>
            <div>
              <span className="block font-bold text-teal-deep">Speed Rating</span>
              <span className="mt-1 block font-medium">{preliminary?.pageSpeedEstimate?.replace("_", " ") || "MOBILE SLOW"}</span>
            </div>
            <div>
              <span className="block font-bold text-teal-deep">Mobile Layout</span>
              <span className="mt-1 block font-medium">{preliminary?.mobileOptimized ? "Optimized" : "Needs Fixes"}</span>
            </div>
          </div>

          {error && (
            <div className="rounded-xl bg-coral/10 border border-coral/20 p-4 text-center text-sm font-semibold text-coral">
              {error}
            </div>
          )}

          <form onSubmit={handleStep2} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="firstName" className="block font-body text-xs font-semibold uppercase tracking-wider text-ink-2 mb-2">
                  First Name
                </label>
                <input
                  id="firstName"
                  type="text"
                  required
                  placeholder="e.g. John"
                  className="w-full rounded-xl border border-line bg-paper px-4 py-3 font-body text-ink focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block font-body text-xs font-semibold uppercase tracking-wider text-ink-2 mb-2">
                  Last Name
                </label>
                <input
                  id="lastName"
                  type="text"
                  required
                  placeholder="e.g. Doe"
                  className="w-full rounded-xl border border-line bg-paper px-4 py-3 font-body text-ink focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block font-body text-xs font-semibold uppercase tracking-wider text-ink-2 mb-2">
                Professional Email
              </label>
              <input
                id="email"
                type="email"
                required
                placeholder="e.g. dr.john@clinicwebsite.com"
                className="w-full rounded-xl border border-line bg-paper px-4 py-3 font-body text-ink focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="role" className="block font-body text-xs font-semibold uppercase tracking-wider text-ink-2 mb-2">
                  Your Practice Role
                </label>
                <input
                  id="role"
                  type="text"
                  required
                  placeholder="e.g. Dentist / Owner"
                  className="w-full rounded-xl border border-line bg-paper px-4 py-3 font-body text-ink focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="phone" className="block font-body text-xs font-semibold uppercase tracking-wider text-ink-2 mb-2">
                  Phone Number <span className="text-slate font-normal">(optional)</span>
                </label>
                <input
                  id="phone"
                  type="tel"
                  placeholder="e.g. 312-555-0199"
                  className="w-full rounded-xl border border-line bg-paper px-4 py-3 font-body text-ink focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-start gap-3 pt-2">
              <input
                id="consent"
                type="checkbox"
                required
                className="mt-1 h-4 w-4 rounded border-line text-teal focus:ring-teal"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
              />
              <label htmlFor="consent" className="font-body text-[12.5px] leading-relaxed text-slate">
                I consent to receive diagnostic updates and promotional communications regarding dental marketing solutions. I can opt-out at any time.
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-teal py-4 font-body text-sm font-bold text-ink shadow-[0_12px_28px_-10px_rgba(14,170,155,0.4)] transition-colors hover:bg-teal-deep hover:text-white disabled:bg-line disabled:text-slate"
            >
              {loading ? "Generating detailed scorecard..." : "Unlock My Detailed Report"}
            </button>
          </form>
        </div>
      )}

    </div>
  );
}

export default function FreeDentalAuditPage() {
  return (
    <div className="flex min-h-screen flex-col bg-paper text-ink selection:bg-teal selection:text-white">
      <header className="mx-auto flex w-full max-w-[1200px] justify-between px-6 py-6 sm:px-8">
        <a href="/" className="font-display text-xl font-bold tracking-tight text-ink">
          Smile AI<span className="text-teal">.</span>
        </a>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12 sm:py-16">
        <Suspense fallback={
          <div className="text-center space-y-4">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-line border-t-teal mx-auto" />
            <p className="font-body text-sm font-semibold">Initializing audit module...</p>
          </div>
        }>
          <AuditWizardForm />
        </Suspense>
      </main>

      <footer className="py-6 text-center font-body text-[13px] text-slate border-t border-line">
        &copy; {new Date().getFullYear()} Smile AI Marketing. All rights reserved.
      </footer>
    </div>
  );
}

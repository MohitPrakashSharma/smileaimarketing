import type { Metadata } from "next";
import Header from "@/components/Header";
import VideoHero from "@/components/VideoHero";
import Footer from "@/components/Footer";

/**
 * Second homepage concept, built up section by section. Opens with the
 * cinematic video hero; kept out of search indexes while it's a draft.
 */
export const metadata: Metadata = {
  title: "Homepage concept 2",
  robots: { index: false, follow: false },
};

export default function HomeV2() {
  return (
    <div className="contents xl:[--container-max-width:80vw]">
      <Header />
      <main className="flex-1">
        <VideoHero />
      </main>
      <Footer />
    </div>
  );
}

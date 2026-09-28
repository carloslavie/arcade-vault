import type { Metadata } from "next";
import { About } from "@/components/about";
import { RevealObserver } from "@/components/reveal-observer";

export const metadata: Metadata = { title: "Acerca de" };

export default function AboutPage() {
  return (
    <>
      <About />
      <RevealObserver />
    </>
  );
}

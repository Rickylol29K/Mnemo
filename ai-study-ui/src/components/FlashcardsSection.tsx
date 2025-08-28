"use client";

import React from "react";
import Flashcards from "@/components/Flashcards";

type Card = { q: string; a: string };

export default function FlashcardsSection({ items }: { items?: Card[] }) {
  return <Flashcards items={items} />;
}

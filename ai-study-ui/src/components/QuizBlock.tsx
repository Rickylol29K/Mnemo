"use client";

import React from "react";
import Quiz, { type Q } from "@/components/Quiz";

type Props = { items?: Q[] };

export default function QuizBlock({ items }: Props) {
  return <Quiz items={items} />;
}

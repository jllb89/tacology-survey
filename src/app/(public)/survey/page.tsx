// src/app/(admin)/admin/customers/[id]/page.tsx
import React from "react";

type Props = {
  params: { id: string };
};

export default function CustomerPage({ params }: Props) {
  return (
    <div style={{ padding: 24 }}>
      <h1>Customer</h1>
      <p>Customer ID: {params.id}</p>
    </div>
  );
}

import React from 'react';
import Head from 'next/head';
import { DashboardLayoutWithPreferences } from '@/components/DashboardLayout';

export default function Home() {
  return (
    <>
      <Head>
        <title>FII Dashboard</title>
        <meta name="description" content="Real Estate Fund Dashboard" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <main className="min-h-screen bg-gray-900">
        <DashboardLayoutWithPreferences />
      </main>
    </>
  );
}

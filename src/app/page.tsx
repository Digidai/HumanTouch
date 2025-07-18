import { Header } from '@/components/Header';
import { Dashboard } from '@/components/Dashboard';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <Dashboard />
    </div>
  );
}
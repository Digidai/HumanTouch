import { Header } from '@/components/Header';
import { Dashboard } from '@/components/Dashboard';

export default function Home() {
  return (
    <div className="min-h-screen">
      <Header />
      <Dashboard />
    </div>
  );
}

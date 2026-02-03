import PromotionalLanding from '@/components/PromotionalLanding';
import AuthGatedHome from '@/components/AuthGatedHome';

export const dynamic = 'force-dynamic';

export default function Home() {
  return (
    <>
      {/* PromotionalLanding is SSR'd into the initial HTML for crawlers */}
      <div id="landing-ssr">
        <PromotionalLanding />
      </div>
      {/* AuthGatedHome hydrates on the client and replaces content when authenticated */}
      <AuthGatedHome />
    </>
  );
}

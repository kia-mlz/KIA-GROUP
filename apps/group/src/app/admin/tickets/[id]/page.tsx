import AdminTicketDetail from './TicketDetail';

// Static export (GitHub Pages) requires concrete params for dynamic routes.
// A single demo ticket id keeps that export navigable. Unknown ids are served
// on demand unless this build is the Pages export.
export function generateStaticParams() {
  return [{ id: 'demo-ticket-1' }];
}

// Do not export `dynamicParams`. Next 16 only accepts a boolean literal here.
// Explicit `false` 404s real ticket ids on `next start` and Docker standalone.
// Explicit `true` breaks `output: 'export'`. The default serves unknown ids
// on demand; the Pages export only contains generateStaticParams.
export default function Page() {
  return <AdminTicketDetail />;
}

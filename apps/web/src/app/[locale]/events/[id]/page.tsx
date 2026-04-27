// TODO Eliott — Détail événement : infos, bouton "S'inscrire"
// TODO Timéo — si payant : redirection vers Stripe Checkout
export default function EventDetailPage({ params }: { params: { id: string } }) {
  return <main>Événement {params.id}</main>;
}

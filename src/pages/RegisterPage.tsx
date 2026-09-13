import { RegistrationForm } from '@/features/participants/RegistrationForm';

export function RegisterPage() {
  return (
    <div className="container max-w-2xl py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
          Inscription à la cérémonie
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Renseignez vos informations. Selon votre catégorie, une vérification
          ou un paiement pourra être requis avant l'émission de votre billet.
        </p>
      </header>
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <RegistrationForm />
      </div>
    </div>
  );
}

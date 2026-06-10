import AuthLayout from "../component/AuthLayout";
import ForgotPasswordForm from "../component/ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return (
    <AuthLayout
      title="Forgot Password?"
      subtitle="No worries. Enter your email and we'll send you a reset link."
    >
      <ForgotPasswordForm />
    </AuthLayout>
  );
}
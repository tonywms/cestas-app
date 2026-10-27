import {
  LogOut,
} from "lucide-react";

type LogoutButtonProps = {
  mobile?: boolean;
};

export default function LogoutButton({
  mobile = false,
}: LogoutButtonProps) {
  return (
    <form
      action="/auth/signout"
      method="post"
    >
      <button
        type="submit"
        title="Sair da conta"
        aria-label="Sair da conta"
        className={
          mobile
            ? `
              flex h-11 w-11
              shrink-0
              items-center justify-center
              rounded-[15px]
              border border-white/10
              bg-white/10
              text-white
              transition
              hover:bg-white/20
              active:scale-95
            `
            : `
              flex h-10 w-10
              shrink-0
              items-center justify-center
              rounded-[14px]
              bg-red-50
              text-red-600
              transition
              hover:bg-red-100
              active:scale-95
            `
        }
      >
        <LogOut
          size={18}
          strokeWidth={2.2}
        />
      </button>
    </form>
  );
}
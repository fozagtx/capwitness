import { cookies } from "next/headers";
import { OPERATOR_COOKIE, verifyOperatorSession } from "./auth";

export async function isOperator(): Promise<boolean> {
  const cookieStore = await cookies();
  return verifyOperatorSession(cookieStore.get(OPERATOR_COOKIE)?.value);
}


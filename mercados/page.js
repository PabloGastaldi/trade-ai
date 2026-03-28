// app/(app)/mercados/page.js
import MercadosClient from './MercadosClient';

export const metadata = {
  title: 'Mercados — trade.ai',
  description: 'Datos financieros en tiempo real para comercio exterior argentino',
};

export default function MercadosPage() {
  return <MercadosClient />;
}

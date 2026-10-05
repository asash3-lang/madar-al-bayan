import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'Madar Al Bayan | مدار البيان',description:'Explore Islamic source texts in your language, with links to the original references.',icons:{icon:'/favicon.svg',shortcut:'/favicon.svg'}};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="en" dir="ltr" suppressHydrationWarning><body>{children}</body></html>;}

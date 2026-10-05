import {AdminWorkspace} from '@/components/admin-workspace';
import {SiteFrame} from '@/components/site-frame';
export const dynamic='force-dynamic';
export default function Administration(){return <SiteFrame activeSection="admin"><AdminWorkspace/></SiteFrame>;}

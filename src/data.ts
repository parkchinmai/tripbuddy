/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Trip, Member, UserProfile } from './types';

const MONTHS_TH = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

export function deriveTripStatus(dates: string): Trip['status'] {
  const parts = dates.split(' - ');
  if (parts.length !== 2) return 'active';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(parts[0]);
  const end = new Date(parts[1]);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  if (today < start) return 'upcoming';
  if (today > end) return 'past';
  return 'active';
}

export function extractAccountNumber(bankAccount: string): string {
  const match = bankAccount.match(/[\d-]{6,}/);
  return match ? match[0].replace(/-/g, '') : bankAccount;
}

export function formatDateRange(dates: string): string {
  const parts = dates.split(' - ');
  if (parts.length === 2) {
    const start = new Date(parts[0]);
    const end = new Date(parts[1]);
    const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
    if (sameMonth) {
      return `${start.getDate()} - ${end.getDate()} ${MONTHS_TH[start.getMonth()]} ${start.getFullYear()}`;
    }
    return `${start.getDate()} ${MONTHS_TH[start.getMonth()]} ${start.getFullYear()} - ${end.getDate()} ${MONTHS_TH[end.getMonth()]} ${end.getFullYear()}`;
  }
  const d = new Date(dates);
  return `${d.getDate()} ${MONTHS_TH[d.getMonth()]} ${d.getFullYear()}`;
}

export interface ComputedSettlement {
  from: string;
  to: string;
  amount: number;
  fromBankAccount: string;
  toBankAccount: string;
}

export interface MemberBalance {
  name: string;
  avatarUrl: string;
  bankAccount: string;
  totalPaid: number;
  totalShare: number;
  netBalance: number;
}

export function calculateSettlements(members: MemberBalance[]): ComputedSettlement[] {
  const balances = members
    .map(m => ({ name: m.name, bankAccount: m.bankAccount, balance: Math.round(m.netBalance) }))
    .filter(m => m.balance !== 0);

  const debtors = balances.filter(b => b.balance < 0).map(b => ({ ...b, balance: -b.balance }));
  const creditors = balances.filter(b => b.balance > 0);

  debtors.sort((a, b) => b.balance - a.balance);
  creditors.sort((a, b) => b.balance - a.balance);

  const settlements: ComputedSettlement[] = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(debtors[i].balance, creditors[j].balance);
    if (amount > 0) {
      const fromMember = members.find(m => m.name === debtors[i].name)!;
      const toMember = members.find(m => m.name === creditors[j].name)!;
      settlements.push({
        from: debtors[i].name,
        to: creditors[j].name,
        amount,
        fromBankAccount: fromMember.bankAccount,
        toBankAccount: toMember.bankAccount,
      });
    }
    debtors[i].balance -= amount;
    creditors[j].balance -= amount;
    if (debtors[i].balance === 0) i++;
    if (creditors[j].balance === 0) j++;
  }

  return settlements;
}

import arttoyBear from './assets/images/arttoy_bear_1784514270207.jpg';
import arttoyBunny from './assets/images/arttoy_bunny_1784514284349.jpg';
import arttoyCat from './assets/images/arttoy_cat_1784514294703.jpg';
import arttoyDino from './assets/images/arttoy_dino_1784514304407.jpg';
import arttoyFox from './assets/images/arttoy_fox_1784514314264.jpg';
import appLogoTransparentVibrant from './assets/images/app_logo_transparent_vibrant_1784516811006.jpg';

export const HOTLINKS = {
  suitCase: appLogoTransparentVibrant,
  arttoyBear,
  arttoyBunny,
  arttoyCat,
  arttoyDino,
  arttoyFox,
  mainAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB8e6GDODm3QJaWmlW_gkCm5mt6oBI895-9OpMv-j5zaCeVtodBVK3OkmzcZXFQFVWzXK571niHpZGOblDMHgoP6BpHTLnwxZo4jsktmf1Ewesf84IdWZSR9h5tYTUEKDGi55sMHnLhB8utOj-jNYI8nogUr703SwPzYTIILBBJHI7DyvJf6m61NiSN_maZi89cuE2vl9qK57_pNffkwHQ7IBJfmRHthG3me0R1ZMY4Skslj23qIIL6UG-H1KqTl8rKU2Um50sOwD0',
  avatarPink: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDwFnrGPgHwbogglhG-6uyF8c026kNxqJREZfC_4nDM2ZlsW_amzRvcoJVs1umDeV58kEzC3ODeTfmQB-b7Z64QvD3hMddrysBYFVBlP36a-jn1gJ1qXgae5RQH6LZ0KXgc76UEah1XvcQuqEcl2OPtF-CACf9jV-Hm8laarkpZteQ5cHsakO09y96kspk4gXjlwkYHWn7faGhS3PpR4OUCkW535c71IOWnt5EG5ItUMJMMHyNTyIDtFrHL0MkAnvfjGq0wTrLYjVo',
  avatarExplorer: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCnF7NwvU4RM7mHmiVfGJcq91qKZqRhCNOqammEShWp0Ih347kdPo0OwvuHiZ1HkID59FoxxB-bKQO0KZn-gb_IpBpOZhuWagTHhcCSpbntqxGIxRXNZBoWKQjv7ArAVapiCVUGCUXo3iwqjDMFpAI4pYw86dRBEjTuIxKCm-vX9j_c47KNGRWP8k8g_LDiMehFWGQRld-w8JZj_K-O7npiWTlh80Vww9560pqiCSNkXWIZa51ZH_jI5Va9hEAK_bMQ6P6NsHgb14Y',
  avatarRobot: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBLKVdM5m8I1lbv-MH8uww6zMvJb9VXinZbHKZb5jnWKQhbxysBp-55HzqgDQxhzQFrAwFVzC18EeO6hrHAdnTCVDGugGO8hJw2uljJHan_AaDyxlEnGiGjAvgouzCwb0lnJMp3srwYq70BeNzYxxUUKfUNqHvW50T8A_CRgsJtho8xfdBP9zL70sopMXMmnJJUrQE8mqV50fIoapX5MaUuDke6IEBjvxm5TBuivjcKBn7kd35G9uDbFuTwNqouiF5HvnJTDILicI0',
  avatarFox: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDIvP778tmP-coGGpNUxaEKIhTCw-0XRsJgOhxhe-rWAbHo6UMjs7kY7f2T3MtC1XsNQGJ1Y96e-Ylk6KFtzLxviORgpPYVxYlxnI5H9rBbqw3C6j3VHKx3lmqYMMibTMt33SwsUNke56b_V8tOPS4slTjw_9vZiu40Kot7C2JSjZfE3T4R8bRCkjjOCttEyXBOw_UVwI0AjZFkNLp1DHVFlIYEZsBi3ozMtwcbVVLEOLpUBA4GM2lI45UTFI5TUO6KZhxfLe8xRo4',
  profileSarah: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDusI9AQuyzjbAm4pwoluojYn_bZPjgcw3-89k8Gr2Chi9-tSDj0ZKQ0ZzkvKMWV3mUipfbU1gF3LSjZjLXyr_0Yeg52vUq00Hz6cl3ttt2kNYzTCOYMxxbyDahPXk-4gm_QE78D3x8zE4I1zdndbLgU8ViWPaHI1ZxEF-miCyIIvBoxgbOF4aEjC6Rz_WZ1QW8L_bbdWDDsWpCtD7bQNpvng2X41XJuX3QEXsDCpB6_XhmSB-LPdySMBpLe4jwqcujYMysQLCd2dk',
  watPhraThat: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCMrpmkwXkVFUAhkr1Lri5oW6lXEp69qmjdNccSrImCgf3xVt5vCJBHKzorGvYHfsOnht6nl0WjJ4GKy75pjYhDG0L8adQhgcqkoTeU5Of8rpKmYoQYgv_X-85_OnMH36hEt5JWJGq1p0PWBOZXtQ-PWrSGVlADa_jpHys4Apo7-sMjiCYnXJNVU_hHFKLTgO16Hb6bBNMtUHo-E9GEgK9Vpk23z9ld1iOIDmCSzRnZoWGZfvGFBX069Sds15EVQzB3DQaU3C_hxA8',
  chiangMaiHills: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDFjPASYNmSGq3wMknPKtIK7PsYTAScYvM77VNXNDrzfXhIc4dXaI_q5ugbLWIEN2Pw_bgtBews6lRC0Mx_4JmeJApZRnllnsHLkXTSdBFIwapmyZ1tS2-w4HmUCTAOHbQJTKgpKcn8GHfLaC8_CJ_GdcKQbNUlAt-u6HnW4R9V943M6afEF6HhEk0BHTXAbo1fBfwZxWoefgxuTsUu2RjOgFj3RLpDnZHFEvSAwsv-lG_tRnSHVf-lUnJT8hSh9IWMSvc78L0t5iE',
  eiffelTower: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBpgS2IU14AfMdn_QoqZWsH8gYE43jCNbc-pt3tDvSWUdgcmyxWzbN-d75SjoeYSIbcVbVWOfWeYnB6MbbSi8fg9IrR4-BwI_TgjdKapNy5i1VR-7EbQzNehhNBhcx962JF9dUKP3QyFqe_GCH_9oTCe53DG7RMsuuytF62f_2eZs_QG10FOwhbyFEuQ44WiAarYFSkFepTdTjYfShbr1sq4A9nqFNrjJfg3XmrBD8iq5TwFxjdjwMy0vrxZ4LhIPQbxQDwt9Zsbe4',
  singaporeMarina: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC-jMi9Xchaw6dnW6LpEbjfD8K7zQAtSYrW20-YN3W2oEtX3CKBd_hEKnzXRGC0pmaRhqBJKu3uFPRxQGX6ZqpauBk0oc71kV4slJEKhHaVR0YNJgTS4enWlXLz3yETn9OBynbHhKBC-lH1Ttr2seOlVqYhTqwXqxyT_HDrS815q35rFOaRtgiWJowiXcehzQANnGpOKLan7PkQ7Vdv4w08fbbQMCZ8JG5pkN9_hhCMcvreR2xuatksYpKhZN0aAm8_ggZXVVRQO7k',
  boracayBeach: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA8czYwb-2HrOoc6aEi7EfiS5lwZb4M7cx9toxLb491vRz-eAE0zswnK4sD-7oVT3nbyvvSc5CrTlMxEdtdaNvfpHjK-YEhOGj_NV3I2mJXKyAqoKOCZnSdjBx_mQU1g4yRaLpEaXvf7MxoCequbhD8Up0vD1x9rnfViXA77BsUAwepvhc6mKfYUjgPwNFYhaKLxjo7q6WycNbIUCatqIEqxOKKl-sIRydAFcyW_qeweOk4UyZ3j6OBA-F-XtLvF3xwFiD6jgUFXkE',
  phiPhiIslands: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB5LpSYEcXv8EpLbDAxiurCPURoAaTlc1FTAnY5ahJBO5laMIrcmqww-_72vJhnHBzgaacJHA2XrMxYLPE2cdN_UESk7K4QeBoj45M4U6Omucv_TlkK0zS_Mw0eSlESIYqNRpVusQAraT51gjI0awCHAH-Ft1G6Z8Q9f_EYepQODjl-Ha2ks7A9OocNK9DRdPa4ilQmylBS4Ou_ngPS6iE0Iiyfw18S1hvX9FDDgxOaqR5wnJhZ3aYHWj2krtJuaPOGOceXIhNtUm8',
  shibuyaTokyo: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA0TrxNX7XaCn8mqX9GxIZsHGqzxj7IXuLzw1l51iFwO6wFLtbjZFncrP6EpB0NF3KqDo4cCrKvgnbzyg2JvYlt7x_0malhTZBIdUgiuOI1VdWPBJLeVmg19Yd9SFYVCjKS1qJ2aJ63E2C8qCV5XZxkeegIhCnCNMFwvPO7tMjnzqfXh8Aj0TZNMsLBGl0jFENnJ5-rAvI3fXLxYB66pZD30TG7KZFMRntXkwLozWTYdNknHJ1KpIKIRk0C9tPPV5f-EdX1fb0IGt0',
  member1: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBHnNEnz6Ts-g6z_JvBuUByJltAC63m_o5oCZFr60C7bYlIWlUx_xAM7TM--jjG8ZuV9vMQxP1kTKq0pvjwJUBGFUuZtRiUwrDxlpwxbqhzwtOcuBdb9WQcEAee754bdW0qNREwy6w5gJlcygWR6CQ8ztReAzxLQ4O8q3Gs201witv-FqldhUMDgz824lGCqmcHGs8OH5RlHRbU6Fhc9zw7fIz1nfU7dlVTT2bvsToMiCY0K-qq5PeH__btpXZv364j2SxAC-qMl3E',
  member2: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCHHrvkE7-kPej3vu58fGYcWyABTB_-4Um1wXdkWjyKENifZULQiPSRteTZv7ke3Epnlqprjhu30eIOH6niKIfGpc5MuqWyB2RYV-fxUdqM-6LQS6zrof6DiL6mkZ6kEy3xK46ebVGg0iRtiU-mC-g8jC5RiG6aJL94iC2nD3kKOrTbloEaTC42gSuVSAhFx1aNZ6Rzv7UVhLPkZQZMDGcWrjJve9AzEkLDN_xJxHeoDOS0w14HLqCctOSkfGYYZ85iZ9kEDOPnKes',
  member3: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCIIfE-0Xkag2koFqfCxDvnXWarsC2l2fvAAq98LnvyIA_VrrMeWp1UOYzoSH_w1CUYBruttZiJz677AzCmeR6Lh2bW-tx_CRhIcOV_SRO7puHQ0zvnUfr-aFnd3pwI7M0qJqE2SHkRAYuG621leftdx7iBKVsmWkRvEIW8wNhNPa4mtR8k8glCA-AnZMkVEYc8YIj1ffxitaIG3t8VqbkKz_30QiLtjW-jv0r5f01d0pO0SjaiSZIzRJLQo1IIyA6TRqzcr-Lpaes',
  member4: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBPPdSca0s-sc1vkZtJXqjChzufyvfLa7SneD8N1jl1DGST-GwEs42rXcdQNXoX8BuD6DgY2u7z2pYBRPy1J69grCWeZEFSsJs7bayrF_JhnVfntLuh7vuJBoFPRMhMLnZNmLODhB3poWmO8TdJYsjbKIZ3H6B4cRPOwsJa2n3weiS0is33yXbbTLdnYtIg6-AJT3UyegH6bdeyxAELxunnYLkTgdg91bJdkZdoO0ooO-xGtxJ7gHOR_OawnDBn2vhCkFL8IJ6vF3Q'
};

export const defaultProfile: UserProfile = {
  name: 'สมชาย รักการเดินทาง',
  phone: '081-234-5678',
  bankAccount: '045-3-22841-9',
  avatarUrl: HOTLINKS.arttoyBear,
  isAdmin: false
};

export const defaultMembers: Member[] = [
  {
    id: 'm1',
    name: 'ศุภิสรา แก้วมณี',
    phone: '081-111-2233',
    avatarUrl: HOTLINKS.arttoyBunny,
    bankAccount: '045-X-XXXXX-9 (กสิกรไทย)',
    status: 'approved',
    joinDate: '12 มิ.ย. 2024',
    accessLevel: 'admin'
  },
  {
    id: 'm2',
    name: 'ธนพล รัตนกุล',
    phone: '082-222-3344',
    avatarUrl: HOTLINKS.arttoyCat,
    bankAccount: '112-X-XXXXX-1 (ไทยพาณิชย์)',
    status: 'pending',
    joinDate: '15 มิ.ย. 2024',
    accessLevel: 'user'
  },
  {
    id: 'm3',
    name: 'พิมพา สุวรรณ',
    phone: '083-333-4455',
    avatarUrl: HOTLINKS.arttoyDino,
    bankAccount: '230-X-XXXXX-4 (กรุงเทพ)',
    status: 'approved',
    joinDate: '01 มิ.ย. 2024',
    accessLevel: 'user'
  },
  {
    id: 'm4',
    name: 'อานนท์ มีชัย',
    phone: '084-444-5566',
    avatarUrl: HOTLINKS.arttoyFox,
    bankAccount: '777-X-XXXXX-0 (กรุงศรี)',
    status: 'suspended',
    joinDate: '28 พ.ค. 2024',
    accessLevel: 'user'
  }
];

export const initialTrips: Trip[] = [
  {
    id: 't-chiangmai',
    title: 'ทริปเชียงใหม่สุดชิลล์',
    destination: 'Chiang Mai, Thailand',
    country: 'Thailand',
    dates: '2024-07-15 - 2024-07-20',
    budget: 25000,
    coverImgUrl: HOTLINKS.watPhraThat,
    description: 'วัดพระธาตุดอยสุเทพ\nพระธาตุคู่บ้านคู่เมืองเจดีย์สีทองอร่ามที่มองเห็นจากทุกที่ในเมืองเชียงใหม่',
    status: 'active',
    expenses: [
      {
        id: 'e1',
        title: 'ข้าวซอยแม่สาย',
        amount: 450,
        category: 'Food',
        date: 'วันนี้',
        paidBy: 'คุณต้น',
        splitWith: ['คุณต้น', 'คุณพลอย', 'สมชาย']
      },
      {
        id: 'e2',
        title: 'Grab ไปนิมมาน',
        amount: 120,
        category: 'Travel',
        date: 'วันนี้',
        paidBy: 'คุณพลอย',
        splitWith: ['คุณต้น', 'คุณพลอย', 'สมชาย']
      },
      {
        id: 'e3',
        title: 'The Inside House (คืนที่ 2)',
        amount: 4200,
        category: 'Accommodation',
        date: 'เมื่อวาน',
        paidBy: 'คุณต้น',
        splitWith: ['คุณต้น', 'คุณพลอย', 'สมชาย']
      }
    ]
  },
  {
    id: 't-past-chiangmai',
    title: 'พักผ่อนเชียงใหม่',
    destination: 'Chiang Mai, Thailand',
    country: 'Thailand',
    dates: '2024-01-10 - 2024-01-13',
    budget: 15000,
    coverImgUrl: HOTLINKS.chiangMaiHills,
    status: 'past',
    days: 3,
    expenses: []
  },
  {
    id: 't-past-europe',
    title: 'ยุโรปในฝัน',
    destination: 'Paris, France',
    country: 'France',
    dates: '2023-12-01 - 2023-12-15',
    coverImgUrl: HOTLINKS.eiffelTower,
    budget: 120000,
    status: 'past',
    days: 14,
    expenses: []
  },
  {
    id: 't-past-singapore',
    title: 'สิงคโปร์ทริปด่วน',
    destination: 'Marina Bay, Singapore',
    country: 'Singapore',
    dates: '2023-11-10 - 2023-11-12',
    coverImgUrl: HOTLINKS.singaporeMarina,
    budget: 18000,
    status: 'past',
    days: 2,
    expenses: []
  },
  {
    id: 't-past-philippines',
    title: 'ซัมเมอร์ ฟิลิปปินส์',
    destination: 'Boracay, Philippines',
    country: 'Philippines',
    dates: '2023-04-15 - 2023-04-20',
    coverImgUrl: HOTLINKS.boracayBeach,
    budget: 22000,
    status: 'past',
    days: 5,
    expenses: []
  }
];

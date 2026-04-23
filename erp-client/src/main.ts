import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { ElAvatar } from 'element-plus/es/components/avatar/index'
import { ElButton } from 'element-plus/es/components/button/index'
import { ElDatePicker } from 'element-plus/es/components/date-picker/index'
import { ElIcon } from 'element-plus/es/components/icon/index'
import { ElInput } from 'element-plus/es/components/input/index'
import { ElInputNumber } from 'element-plus/es/components/input-number/index'
import { ElLoading } from 'element-plus/es/components/loading/index'
import { ElOption, ElSelect } from 'element-plus/es/components/select/index'
import { ElPagination } from 'element-plus/es/components/pagination/index'
import { ElRadioButton, ElRadioGroup } from 'element-plus/es/components/radio/index'
import { ElSwitch } from 'element-plus/es/components/switch/index'
import { ElTabPane, ElTabs } from 'element-plus/es/components/tabs/index'
import { ElTable, ElTableColumn } from 'element-plus/es/components/table/index'
import { ElTag } from 'element-plus/es/components/tag/index'
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowRightBold,
  Avatar,
  Back,
  Bell,
  Box,
  Briefcase,
  Brush,
  Calendar,
  Check,
  Clock,
  CloseBold,
  Coin,
  Collection,
  CollectionTag,
  Connection,
  CopyDocument,
  CreditCard,
  DataAnalysis,
  DataBoard,
  Document,
  DocumentCopy,
  Files,
  FolderOpened,
  FullScreen,
  Goods,
  Grid,
  Histogram,
  House,
  InfoFilled,
  Location,
  Management,
  Memo,
  Money,
  Monitor,
  Minus,
  Notebook,
  OfficeBuilding,
  Opportunity,
  Paperclip,
  Plus,
  Postcard,
  PriceTag,
  Search,
  Sell,
  SetUp,
  Setting,
  ShoppingBag,
  ShoppingCart,
  Tickets,
  Tools,
  User,
  UserFilled,
  Van,
} from '@element-plus/icons-vue'
import 'element-plus/es/components/avatar/style/css'
import 'element-plus/es/components/button/style/css'
import 'element-plus/es/components/date-picker/style/css'
import 'element-plus/es/components/icon/style/css'
import 'element-plus/es/components/input/style/css'
import 'element-plus/es/components/input-number/style/css'
import 'element-plus/es/components/loading/style/css'
import 'element-plus/es/components/message/style/css'
import 'element-plus/es/components/pagination/style/css'
import 'element-plus/es/components/radio/style/css'
import 'element-plus/es/components/select/style/css'
import 'element-plus/es/components/switch/style/css'
import 'element-plus/es/components/table/style/css'
import 'element-plus/es/components/tabs/style/css'
import 'element-plus/es/components/tag/style/css'
import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/auth'
import { useConnectionStore } from './stores/connection'
import { usePreferencesStore } from './stores/preferences'
import './styles/index.css'

const app = createApp(App)
const pinia = createPinia()

const componentRegistry = {
  ElAvatar,
  ElButton,
  ElDatePicker,
  ElIcon,
  ElInput,
  ElInputNumber,
  ElOption,
  ElPagination,
  ElRadioButton,
  ElRadioGroup,
  ElSelect,
  ElSwitch,
  ElTabPane,
  ElTable,
  ElTableColumn,
  ElTabs,
  ElTag,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowRightBold,
  Avatar,
  Back,
  Bell,
  Box,
  Briefcase,
  Brush,
  Calendar,
  Check,
  Clock,
  CloseBold,
  Coin,
  Collection,
  CollectionTag,
  Connection,
  CopyDocument,
  CreditCard,
  DataAnalysis,
  DataBoard,
  Document,
  DocumentCopy,
  Files,
  FolderOpened,
  FullScreen,
  Goods,
  Grid,
  Histogram,
  House,
  InfoFilled,
  Location,
  Management,
  Memo,
  Money,
  Monitor,
  Minus,
  Notebook,
  OfficeBuilding,
  Opportunity,
  Paperclip,
  Plus,
  Postcard,
  PriceTag,
  Search,
  Sell,
  SetUp,
  Setting,
  ShoppingBag,
  ShoppingCart,
  Tickets,
  Tools,
  User,
  UserFilled,
  Van,
}

for (const [key, component] of Object.entries(componentRegistry)) {
  app.component(key, component)
}

async function bootstrap() {
  app.directive('loading', ElLoading.directive)
  app.use(pinia)
  const connectionStore = useConnectionStore(pinia)
  const preferencesStore = usePreferencesStore(pinia)
  const authStore = useAuthStore(pinia)
  await connectionStore.initialize()
  await preferencesStore.initialize()
  authStore.initialize()
  app.use(router)
  app.mount('#app')
}

void bootstrap()

import { Box } from '@mui/system'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
     process.env.NEXT_PUBLIC_SUPABASE_URL!,
     process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const Page = async () => {
     // const { data: location } = await supabase
     //      .from('tblBuildingLocations')
     //      .select('*')
     //      .eq('id', params.id)
     //      .single()

     // if (!location) {
     //      notFound()
     // }

     return (
          <Box>
               aaaaaaaaa
          </Box>
     )
}

export default Page


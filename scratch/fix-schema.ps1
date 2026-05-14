$c = Get-Content 'prisma/schema.prisma'
$c[0..3013] | Set-Content 'prisma/schema.prisma'

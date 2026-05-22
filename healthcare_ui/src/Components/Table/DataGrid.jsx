import * as React from 'react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { MdChevronLeft, MdChevronRight } from 'react-icons/md';

const DataGrid = React.memo(function DataGrid({
	columns = [],
	rows = [],
	rowsPerPageOptions = [5, 10, 25, 100],
	defaultRowsPerPage = 5,
	maxHeight = 455,
	stickyHeader = true,
	hidePaginationWhenSinglePage = true,
	getRowId,
}) {
	const [page, setPage] = React.useState(0);
	const [rowsPerPage, setRowsPerPage] = React.useState(defaultRowsPerPage);
	const totalPages = React.useMemo(
		() => Math.max(1, Math.ceil(rows.length / rowsPerPage)),
		[rows.length, rowsPerPage],
	);
	const shouldShowPagination =
		!hidePaginationWhenSinglePage || rows.length > rowsPerPage;

	React.useEffect(() => {
		if (page > totalPages - 1) {
			setPage(totalPages - 1);
		}
	}, [page, totalPages]);

	const visibleRows = React.useMemo(
		() =>
			rows.slice(
				page * rowsPerPage,
				page * rowsPerPage + rowsPerPage,
			),
		[rows, page, rowsPerPage],
	);

	return (
		<Paper
			elevation={0}
			sx={{
				width: '100%',
				overflow: 'hidden',
				border: '1px solid #e6ebf2',
				borderRadius: 3,
			}}
		>
			<TableContainer sx={{ maxHeight }}>
				<Table stickyHeader={stickyHeader} aria-label="data grid" size="small">
					<TableHead>
						<TableRow>
							{columns.map((column) => (
								<TableCell
									key={column.id}
									align={column.align}
									style={{ minWidth: column.minWidth }}
									sx={{
										backgroundColor: '#f6f8fc',
										color: '#1f2937',
										fontWeight: 700,
										borderBottom: '1px solid #dde5ef',
									}}
								>
									{column.label}
								</TableCell>
							))}
						</TableRow>
					</TableHead>
					<TableBody>
						{visibleRows.map((row, index) => {
							const rowId =
								(typeof getRowId === 'function' && getRowId(row, index)) ||
								row.id ||
								row.code ||
								`${page}-${index}`;

							return (
								<TableRow
									hover
									tabIndex={-1}
									key={rowId}
									sx={{
										'&:nth-of-type(even)': {
											backgroundColor: '#fbfdff',
										},
									}}
								>
									{columns.map((column) => {
										const value = row[column.id];
										const displayValue = column.format
											? column.format(value, row)
											: value;
										return (
											<TableCell
												key={column.id}
												align={column.align}
												sx={{ borderBottom: '1px solid #edf1f7' }}
											>
												{displayValue}
											</TableCell>
										);
									})}
								</TableRow>
							);
						})}
						{visibleRows.length === 0 ? (
							<TableRow>
								<TableCell
									colSpan={columns.length || 1}
									align="center"
									sx={{ py: 4, color: '#6b7280' }}
								>
									No records found
								</TableCell>
							</TableRow>
						) : null}
					</TableBody>
				</Table>
			</TableContainer>
			{shouldShowPagination ? (
				<Box
					sx={{
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'flex-end',
						gap: 2,
						px: 2,
						py: 1,
						borderTop: '1px solid #e6ebf2',
						flexWrap: 'wrap',
					}}
				>
					<Typography variant="body2" sx={{ color: '#4b5563' }}>
						{rows.length === 0
							? '0-0 of 0'
							: `${page * rowsPerPage + 1}-${Math.min(
									(page + 1) * rowsPerPage,
									rows.length,
								)} of ${rows.length}`}
					</Typography>

					<Box sx={{ display: 'flex', alignItems: 'center' }}>
						<IconButton
							size="small"
							onClick={() => setPage((p) => Math.max(0, p - 1))}
							disabled={page === 0}
							aria-label="Previous page"
						>
							<MdChevronLeft size={20} />
						</IconButton>
						<IconButton
							size="small"
							onClick={() =>
								setPage((p) => Math.min(totalPages - 1, p + 1))
							}
							disabled={page >= totalPages - 1}
							aria-label="Next page"
						>
							<MdChevronRight size={20} />
						</IconButton>
					</Box>
				</Box>
			) : null}
		</Paper>
	);
});

export default DataGrid;

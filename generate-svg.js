import fs from "fs";
import * as cheerio from "cheerio";

const apiLeagueKey = process.env.API_LEAGUE_KEY;
const githubToken = process.env.GH_API_TOKEN;
const wakatimeKey = process.env.WAKATIME_API_KEY;

async function getAsciiArtFromImage(imgUrl) {
	const url = `https://api.apileague.com/convert-image-to-ascii-txt?width=125&height=125&api-key=${apiLeagueKey}&url=${imgUrl}`;
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(
			`Response status: ${response.status}, Failed to get ASCII art`,
		);
	}

	const art = await response.text();
	return art;
}

function timeAgo(dateString) {
	const now = new Date();
	const past = new Date(dateString);
	let diffInSeconds = Math.floor((now - past) / 1000);

	const units = [
		{ name: "year", seconds: 31536000 }, // 365 days
		{ name: "month", seconds: 2592000 }, // 30 days
		{ name: "day", seconds: 86400 },
		{ name: "hour", seconds: 3600 },
		{ name: "minute", seconds: 60 },
		{ name: "second", seconds: 1 },
	];

	const timeAgoParts = [];

	for (const unit of units) {
		const interval = Math.floor(diffInSeconds / unit.seconds);
		if (interval >= 1) {
			timeAgoParts.push(`${interval} ${unit.name}${interval > 1 ? "s" : ""}`);
			diffInSeconds -= interval * unit.seconds;
		}
	}

	return timeAgoParts.length > 0
		? timeAgoParts.slice(0, 3).join(", ") + " ago"
		: "just now";
}

async function getStreakData(username) {
	const url = `https://github-readme-streak-stats.herokuapp.com/?user=${username}`;

	const res = await fetch(url);
	if (!res.ok) {
		throw new Error("Res status:", res.status, "Failed to get streak data");
	}

	const svgString = await res.text();
	const $ = cheerio.load(svgString, { xmlMode: true });

	const data = {
		totalContributions: {
			value: $('g[transform="translate(82.5, 48)"] text').text().trim(),
			range: $('g[transform="translate(82.5, 114)"] text').text().trim(),
		},
		currentStreak: {
			value: $('g[transform="translate(247.5, 48)"] text').text().trim(),
			range: $('g[transform="translate(247.5, 145)"] text').text().trim(),
		},
		longestStreak: {
			value: $('g[transform="translate(412.5, 48)"] text').text().trim(),
			range: $('g[transform="translate(412.5, 114)"] text').text().trim(),
		},
	};

	return data;
}

async function getTotalTime() {
	const url = `https://wakatime.com/api/v1/users/current/all_time_since_today`;

	const res = await fetch(url, {
		headers: {
			Authorization: `Basic ${wakatimeKey}`,
		},
	});

	if (!res.ok) {
		throw new Error("Res status:", res.status);
	}

	const data = await res.json();

	return data.data.text;
}

async function getUserData() {
	const url = `https://api.github.com/user`;

	const res = await fetch(url, {
		headers: { Authorization: `Bearer ${githubToken}` },
	});

	if (!res.ok) {
		throw new Error("Res status:", res.status);
	}

	const data = await res.json();
	console.log("Fetched GitHub user data");
	const totalTime = await getTotalTime();
	console.log("Fetched Wakatime Data");
	const streakData = await getStreakData(data?.login || "Judge-Paul");
	console.log("Fetched Streak Data");

	return {
		username: data?.login || "Judge-Paul",
		profile_picture: data.avatar_url,
		sections: [
			{
				items: [
					{ label: "OS", value: "Windows 11, Linux Mint, Arch Linux" },
					{ label: "Wakatime", value: totalTime },
					{ label: "IDE", value: "VS Code, Sublime Text 3, Zed" },
					{ label: "Languages", value: "JavaScript, TypeScript" },
					{ label: "Frameworks", value: "React, Next.js, Express" },
				],
			},
			{
				name: "Profile",
				items: [
					{ label: "Role", value: "Software Developer" },
					{ label: "Status", value: "Cracked" },
					{ label: "Twitter", value: `@${data?.twitter_username}` },
					{ label: "Portfolio", value: data?.blog },
				],
			},
			{
				name: "GitHub",
				items: [
					{
						label: "Audience",
						value: `${data?.followers || 0} Followers | ${
							data?.following || 0
						} Following`,
					},
					{
						label: "Repos",
						value: `${data.public_repos + data.total_private_repos} (${
							data.public_repos
						} Public | ${data.total_private_repos} Private)`,
					},
					{ label: "Joined", value: timeAgo(data.created_at) },
					{
						label: "Contributions",
						value: `${streakData.totalContributions.value} (${streakData.totalContributions.range})`,
					},
					{
						label: "Current Streak",
						value: `${streakData.currentStreak.value} (${streakData.currentStreak.range})`,
					},
					{
						label: "Longest Streak",
						value: `${streakData.longestStreak.value} (${streakData.longestStreak.range})`,
					},
				],
			},
		],
	};
}

function generateSVGArt(art) {
	// breakup art line by line so it can be mapped through to display the art
	const chunks = art.split("\n").filter((line) => line.length > 0);

	let svgArt = "";
	let y = 100;
	let x = 100;

	// define line height
	const yInc = 8.6;

	for (let i = 0; i < chunks.length; i++) {
		svgArt += `<tspan x="${x}" y="${y}">${chunks[i]}</tspan>\n`;
		const numY = Number(y);
		y = (numY + yInc).toFixed(2);
	}

	return `<text x="100" y="100" fill="#c9d1d9" class="ascii">\n
${svgArt}
</text>`;
}

function generateSVGText(data) {
	let yPosition = 150;
	const lineHeight = (1282 - yPosition * 2) / 22;
	const svgLines = [];

	// Username
	svgLines.push(
		`<tspan x="1300" y="${yPosition.toFixed(2)}">${
			data.username
		}@GitHub</tspan>`,
	);
	yPosition += lineHeight;
	yPosition = parseFloat(yPosition.toFixed(2)); // Round yPosition to 2 decimal places
	svgLines.push(`<tspan x="1300" y="${yPosition}">---------------</tspan>`);
	yPosition += lineHeight;
	yPosition = parseFloat(yPosition.toFixed(2));

	// Sections
	data.sections.forEach((section) => {
		// Section title
		if (section.name) {
			svgLines.push(
				`<tspan x="1300" y="${yPosition}" class="keyColor">${section.name}</tspan>:`,
			);
			yPosition += lineHeight;
			yPosition = parseFloat(yPosition.toFixed(2));
			svgLines.push(`<tspan x="1300" y="${yPosition}">——————</tspan>`);
			yPosition += lineHeight;
			yPosition = parseFloat(yPosition.toFixed(2));
		}

		// Section items
		section.items.forEach((item) => {
			svgLines.push(
				`<tspan x="1300" y="${yPosition}" class="keyColor">${item.label}</tspan>: <tspan class="valueColor">${item.value}</tspan>`,
			);
			yPosition += lineHeight;
			yPosition = parseFloat(yPosition.toFixed(2)); // Round yPosition to 2 decimal places
		});

		// Extra space between sections
		yPosition += lineHeight;
		yPosition = parseFloat(yPosition.toFixed(2));
	});

	// Combine all lines into a single SVG text block
	return `<text x="500" y="150" fill="#c9d1d9" font-size="40px">
${svgLines.join("\n")}
</text>`;
}

async function main() {
	const user = await getUserData();
	console.log("Gotten user data");

	const art = await getAsciiArtFromImage(user.profile_picture);
	console.log("Gotten ASCII text from image");

	const svgArt = generateSVGArt(art);
	console.log("Generated SVG Art section");
	const svgText = generateSVGText(user);
	console.log("Generated SVG Text section");

	const svg = `<?xml version="1.0" encoding="utf-8"?>
<svg xmlns="http://www.w3.org/2000/svg" font-family="Andale Mono,AndaleMono,Consolas,monospace" width="2500px" height="1282px" font-size="16px">
<style>
	.keyColor {fill: #ffa657;}
	.valueColor {fill: #a5d6ff;}
	.addColor {fill: #3fb950;}
	.delColor {fill: #f85149;}
	.commentColor {fill: #8b949e;}
	text, tspan {white-space: pre;}
</style>

<rect width="2500px" height="1282px" fill="#161b22" rx="15" />

${svgArt}

${svgText}

</svg>
`;

	fs.mkdirSync("output", { recursive: true });
	fs.writeFileSync("output/neofetch.svg", svg);
	console.log("Saved SVG to output/neofetch.svg");
}

main();

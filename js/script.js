// Find our date picker inputs on the page
const startInput = document.getElementById('startDate');
const endInput = document.getElementById('endDate');
const getImagesButton = document.querySelector('.filters button');
const gallery = document.getElementById('gallery');
const spaceFactText = document.getElementById('spaceFactText');

// Paste your NASA API key between the quotes below.
// Example: const apiKey = 'abc123yourkeyhere';
const apiKey = 'PjiAVEyy6ObGrzxx7bhbLqof9OK30gHfzdLB4i5O';
let currentImageItems = [];

// Keep a list of 10 facts and show one at random every page refresh.
const spaceFacts = [
	'The Sun contains about 99.8% of the total mass in our solar system.',
	'One day on Venus is longer than one year on Venus.',
	'Neutron stars can spin hundreds of times per second.',
	'Jupiter has the shortest day of any planet, about 10 hours long.',
	'Saturn could float in water because its average density is very low.',
	'A light-year is the distance light travels in one year, about 9.46 trillion kilometers.',
	'Our Milky Way galaxy has more than 100 billion stars.',
	'Mars has the largest volcano in the solar system, Olympus Mons.',
	'The International Space Station travels around Earth about every 90 minutes.',
	'Black holes do not suck like vacuums; they pull with gravity when objects get close.'
];

function showRandomSpaceFact() {
	const randomIndex = Math.floor(Math.random() * spaceFacts.length);
	spaceFactText.textContent = spaceFacts[randomIndex];
}

// Build a modal once, then reuse it whenever a gallery item is clicked.
const modalOverlay = document.createElement('div');
modalOverlay.className = 'modal-overlay';
modalOverlay.innerHTML = `
	<div class="modal-content usa-card">
		<button class="modal-close usa-button usa-button--outline" aria-label="Close image details">Close</button>
		<img class="modal-image" src="" alt="" />
		<iframe class="modal-video" src="" title="APOD video player" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
		<video class="modal-video-file" controls></video>
		<h2 class="modal-title"></h2>
		<p class="modal-date"></p>
		<p class="modal-explanation"></p>
	</div>
`;
document.body.appendChild(modalOverlay);

const modalCloseButton = modalOverlay.querySelector('.modal-close');
const modalImage = modalOverlay.querySelector('.modal-image');
const modalVideo = modalOverlay.querySelector('.modal-video');
const modalVideoFile = modalOverlay.querySelector('.modal-video-file');
const modalTitle = modalOverlay.querySelector('.modal-title');
const modalDate = modalOverlay.querySelector('.modal-date');
const modalExplanation = modalOverlay.querySelector('.modal-explanation');

// Call the setupDateInputs function from dateRange.js
// This sets up the date pickers to:
// - Default to a range of 9 days (from 9 days ago to today)
// - Restrict dates to NASA's image archive (starting from 1995)
setupDateInputs(startInput, endInput);
showRandomSpaceFact();

// Build one gallery card for each APOD image item.
function createGalleryItem(item) {
	const previewImage = item.media_type === 'video' ? item.thumbnail_url : item.url;
	const mediaPreview = previewImage
		? `<img src="${previewImage}" alt="${item.title}" />`
		: '<div class="gallery-fallback-media">Video Preview Unavailable</div>';

	const playButton = item.media_type === 'video'
		? `
			<div class="video-play-button" aria-hidden="true">
				<span class="play-triangle"></span>
			</div>
		`
		: '';

	return `
		<article class="gallery-item usa-card ${item.media_type === 'video' ? 'gallery-item-video' : ''}" data-date="${item.date}">
			<div class="gallery-media-frame">
				${mediaPreview}
				${playButton}
			</div>
			<p><strong>${item.title}</strong></p>
			<p>${item.date}</p>
		</article>
	`;
}

function renderGallery(items) {
	// Keep only media entries that can be displayed as image or video cards.
	const mediaItems = items.filter((item) => item.media_type === 'image' || item.media_type === 'video');
	currentImageItems = mediaItems;

	if (mediaItems.length === 0) {
		gallery.innerHTML = `
			<div class="placeholder">
				<div class="placeholder-icon">🚫</div>
				<p>No APOD media found in that range. Try different dates.</p>
			</div>
		`;
		return;
	}

	gallery.innerHTML = mediaItems.map((item) => createGalleryItem(item)).join('');
}

function isDirectVideoFile(url) {
	return /\.(mp4|webm|ogg)(\?.*)?$/i.test(url);
}

function openModal(item) {
	// Hide all media elements first, then show only the one we need.
	modalImage.style.display = 'none';
	modalVideo.style.display = 'none';
	modalVideoFile.style.display = 'none';

	if (item.media_type === 'video') {
		if (isDirectVideoFile(item.url)) {
			modalVideoFile.src = item.url;
			modalVideoFile.style.display = 'block';
		} else {
			modalVideo.src = item.url;
			modalVideo.style.display = 'block';
		}
	} else {
		modalImage.src = item.hdurl || item.url;
		modalImage.alt = item.title;
		modalImage.style.display = 'block';
	}

	modalTitle.textContent = item.title;
	modalDate.textContent = item.date;
	modalExplanation.textContent = item.explanation;
	modalOverlay.classList.add('is-open');
}

function closeModal() {
	modalVideo.src = '';
	modalVideoFile.pause();
	modalVideoFile.src = '';
	modalOverlay.classList.remove('is-open');
}

function handleGalleryClick(event) {
	const clickedItem = event.target.closest('.gallery-item');

	if (!clickedItem) {
		return;
	}

	const selectedDate = clickedItem.dataset.date;
	const selectedItem = currentImageItems.find((item) => item.date === selectedDate);

	if (selectedItem) {
		openModal(selectedItem);
	}
}

function showMessage(icon, text) {
	currentImageItems = [];
	gallery.innerHTML = `
		<div class="placeholder">
			<div class="placeholder-icon">${icon}</div>
			<p>${text}</p>
		</div>
	`;
}

async function getSpaceImages() {
	const startDate = startInput.value;
	const endDate = endInput.value;

	if (!startDate || !endDate) {
		showMessage('⚠️', 'Please choose both a start date and an end date.');
		return;
	}

	showMessage('🛰️', 'Loading space media...');

	const url = `https://api.nasa.gov/planetary/apod?api_key=${apiKey}&start_date=${startDate}&end_date=${endDate}&thumbs=true`;

	try {
		const response = await fetch(url);
		const data = await response.json();

		if (!response.ok) {
			if (response.status === 429 || data?.error?.code === 'OVER_RATE_LIMIT') {
				throw new Error('NASA DEMO_KEY rate limit reached. Please wait and try again, or use your own API key.');
			}

			if (response.status === 400) {
				throw new Error('One or more selected dates are not available yet. Try an earlier end date.');
			}

			const nasaMessage = data?.error?.message || data?.msg;
			throw new Error(nasaMessage || 'Unable to load images from NASA right now.');
		}

		// The API can return either one object or an array, so normalize to an array.
		const items = Array.isArray(data) ? data : [data];
		renderGallery(items);
	} catch (error) {
		showMessage('❌', error.message);
	}
}

// Fetch and display images when the user clicks the button.
getImagesButton.addEventListener('click', getSpaceImages);
gallery.addEventListener('click', handleGalleryClick);
modalCloseButton.addEventListener('click', closeModal);

// Close the modal when the user clicks outside the modal content.
modalOverlay.addEventListener('click', (event) => {
	if (event.target === modalOverlay) {
		closeModal();
	}
});
